import { ALLOW_CUSTOM_PHOTO } from '../constants.js'
import { tcqc } from '../sessions/tcqc.js'
import { BotContext } from '../types/context.js'
import { getCardByIDSimple, updateCardPreferencesImage } from '../utilities/engine/cards.js'
import { getPhotoSwitch, insertCativeiroPhotoSwitch, userHasPendingPhotoSwitch } from '../utilities/engine/proposed-action.js'
import { getHowManyCardsUserHas, getUserByID } from '../utilities/engine/users.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { cdnItemURL, determineMethodToSendMediaNoReply, generateFileName, getUserFromNamekeeper, uploadAttachedPhoto } from '../utilities/telegram.js'

const determineMimeByURLEnding = (url: string) => {
  if (url.endsWith('.gif') || url.endsWith('.gifv')) return 'image/gif'
  if (url.endsWith('.mp4')) return 'video/mp4'
  return 'image/jpeg'
}

export default async (ctx: BotContext) => {
  const hasPendingSwitch = await userHasPendingPhotoSwitch(ctx.userData.id)
  if (hasPendingSwitch) {
    return ctx.reply('Você já tem um vídeo customizado em análise! Aguarde a aprovação ou rejeição do vídeo anterior para enviar outro.')
  }

  const cardID = ctx.args[0]
  if (!cardID || isNaN(parseInt(cardID))) {
    return ctx.replyWithHTML('Você precisa especificar o ID do card que você deseja editar a imagem.\n\nUse <code>/uploadvid id</code> ou <code>/uploadvid id url</code>.')
  }

  const card = await getCardByIDSimple(parseInt(cardID))
  if (!card) {
    return ctx.reply('Card não encontrado. Verifique o ID e tente novamente.')
  }

  const count = await getHowManyCardsUserHas(ctx.userData.id, parseInt(cardID))
  if (count < ALLOW_CUSTOM_PHOTO) {
    return ctx.replyWithHTML(`😟 Ah... para você poder colocar um vídeo customizado, você precisa ter ${ALLOW_CUSTOM_PHOTO} ${card.name}, no mínimo. Faltam ${ALLOW_CUSTOM_PHOTO - count}. Você consegue!`)
  }

  const url = ctx.args[1]
  let imgString = ''
  if (url) {
    // check if url is valid
    if (!url.startsWith('http')) {
      return ctx.reply('URL inválida. Use uma URL válida para fazer upload da imagem.')
    }

    const name = generateFileName(determineMimeByURLEnding(url))
    const t = await _brklyn.images.uploadFileFromUrl(name, url).catch(async () => {
      return false
    })

    if (!t) {
      return ctx.reply('Erro ao fazer upload da imagem.')
    }

    imgString = `url:${cdnItemURL(name)}`
  } else {
    imgString = await uploadAttachedPhoto(ctx, true) as string
    if (!imgString) return
  }

  const d = await insertCativeiroPhotoSwitch(ctx.userData.id, card.id, imgString)

  const imgUrl = await parseImageString(imgString, false, true)
  const method = determineMethodToSendMediaNoReply(imgUrl)
  await _brklyn.telegram[method](process.env.STAFF_GROUP_ID!, imgUrl, {
    caption: `📸 <b>${ctx.from.first_name}</b> (<code>${ctx.userData.id}</code>) enviou um vídeo customizado para o card <b>${card.name}</b>!\n\nAprove clicando em <b>✅ Aprovar</b>, ou rejeite usando <b>❌ Rejeitar</b>.`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Aprovar', callback_data: d.acceptanceData }, { text: '❌ Rejeitar', callback_data: d.rejectionData }]
      ]
    }
  })

  return ctx.replyWithHTML(`✅ Anotado! Minha equipe irá verificar se está tudo certo com seu vídeo e, se estiver, ele será adicionado ao card <b>${card.name}</b>!\nTe informarei na DM se o vídeo foi aprovado ou não.`)
}

export const info = {
  aliases: ['upload']
}

interface CategoryActionCommand {
  id: number
  d: 'yes' | 'no'
}

tcqc.add<CategoryActionCommand>('catpsw', async (ctx) => {
  const { id, d } = ctx.data
  const data = await getPhotoSwitch(id)
  if (!data) return ctx.answerCbQuery('Ação não encontrada. 😔')
  const user = await getUserByID(data.userID)
  if (!user) return ctx.answerCbQuery('Usuário não encontrado. 😔')

  if (d === 'yes') {
    // find user preferences for card id, or create
    await updateCardPreferencesImage(data.userID, data.cardID, data.imageString)
    await _brklyn.telegram.sendMessage(user.tgId.toString(), `🎉 Seu vídeo customizado foi aprovado e adicionado ao card! Use /card ${data.cardID} para ver. Aproveite!`).catch(() => 0)
    await ctx.answerCbQuery('Vídeo aprovado.')
  } else {
    await _brklyn.telegram.sendMessage(user.tgId.toString(), `😔 Seu vídeo customizado para o card foi rejeitado. Tente novamente com outro vídeo!`).catch(() => 0)
    await ctx.answerCbQuery('Vídeo rejeitado.')
  }

  const us = await getUserFromNamekeeper(user.tgId.toString())
  await ctx.deleteMessage().catch(() => 0)
  await _brklyn.db.proposedAction.delete({ where: { id } })
  await _brklyn.telegram.sendMessage(process.env.STAFF_GROUP_ID!, `🖼️ #APROVAÇÃO_DE_VÍDEO\n🧑<a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a> ${d === 'yes' ? 'aprovou' : 'rejeitou'} o vídeo customizado de <a href="tg://user?id=${user.tgId}">${us?.first_name || 'Usuário desconhecido'}</a> para o card <code>${data.cardID}</code>.`, { parse_mode: 'HTML' })
})
