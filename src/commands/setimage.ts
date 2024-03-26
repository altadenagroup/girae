import { BotContext } from '../types/context.js'
import { getCardByID } from '../utilities/engine/cards.js'
import { generatePhotoLink } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { generateID } from '../utilities/misc.js'

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do card para editar a imagem.\n\nUsa-se setimage id')
  }

  const c = await getCardByID(parseInt(card))
  if (!c) {
    return ctx.reply('Card não encontrado.')
  }

  // @ts-ignore
  const photos = ctx.message?.photo || ctx.message?.reply_to_message?.photo
  const photo = photos?.[0] ? photos[photos.length - 1].file_id : null
  let imgString = ctx.args[1] ? `url:${ctx.args[1]}` : null
  if (photo) {
    const link = await generatePhotoLink(photo)
    if (link) {
      const id = generateID(32)
      const aa = await _brklyn.images.uploadFileFromUrl(`${id}.jpg`, link).catch(async (e) => {
        await ctx.reply('Erro ao fazer upload da imagem.')
        return null
      })
      if (aa) imgString = `id:${id}`
    } else {
      return ctx.reply('Não foi possível obter o link da foto.')
    }
  }
  if (!imgString) {
    return ctx.reply('Você precisa enviar uma foto ou passar um link para a imagem.')
  }

  await _brklyn.db.card.update({
    where: {
      id: c.id
    },
    data: {
      image: imgString
    }
  })

  return ctx.replyWithPhoto(parseImageString(imgString, 'ar_3:4,c_crop'), {
    caption: `Imagem do card ${c.name} atualizada.`,
    parse_mode: 'HTML'
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
