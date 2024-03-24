import {Card} from '@prisma/client'
import {SessionContext} from '../sessions/context.js'
import {AdvancedScene} from '../sessions/scene.js'
import {parseImageString} from '../utilities/lucky-engine.js'
import {determineMethodToSendMedia} from '../utilities/telegram.js'
import {addBalance} from '../utilities/engine/economy.js'
import {warn} from 'melchior'

interface DeleteData {
  card: Card
  usercardId: number
}

const rarityIdToPrice = {
  1: ['🥉 Comunm', 250],
  3: ['🥈 Raro', 500],
  4: ['🎖️ Lendário', 1000]
}

const firstStep = async (ctx: SessionContext<DeleteData>) => {
  ctx.session.setMessageToBeQuoted(ctx.message?.message_id)
  ctx.session.data.card = ctx.session.arguments!.card
  const first = await _brklyn.db.userCard.findFirst({
    where: {
      cardId: ctx.session.data.card.id,
      userId: ctx.userData.id
    }
  })
  if (!first) {
    ctx.session.steps.leave()
    return ctx.reply('❌ Você não possui esse card. Você clicou no botão errado, provavelmente.')
  }
  ctx.session.data.usercardId = first?.id
  ctx.session.steps.next()

  const img = parseImageString(ctx.session.data.card.image, 'ar_3:4,c_crop')
  const method = determineMethodToSendMedia(img)
  const text = `Você está deletando...

🃏 <code>${ctx.session.data.card.id}</code>. <b>${ctx.session.data.card.name}</b>

<b>${rarityIdToPrice[ctx.session.data.card.rarityId][0]}</b>
💱 Valor que você receberá: ${rarityIdToPrice[ctx.session.data.card.rarityId][1]} moedas


❌ Para deletar esse card, digite:

<code>${ctx.session.data.card.name.toLowerCase()}</code>

Para cancelar, digite /cancelar.
`
  return ctx[method](img, {
    caption: text,
    parse_mode: 'HTML'
  }).then((m) => ctx.session.setMainMessage(m.message_id))
}

const secondStep = async (ctx: SessionContext<DeleteData>) => {
  // @ts-ignore
  if (ctx.message?.text?.toLowerCase() === ctx.session.data.card.name.toLowerCase()) {
    ctx.session.steps.leave()

    await _brklyn.db.userCard.delete({
      where: {
        id: ctx.session.data.usercardId
      }
    }).catch((e) => {
      warn('es²', `failed to delete card: ${e.message}`)
      return ctx.reply('❌ Ocorreu um erro ao deletar o card. Tente novamente mais tarde.')
    })

    const money = rarityIdToPrice[ctx.session.data.card.rarityId][1]
    await addBalance(ctx.userData.id, money)
    await ctx.session.deleteMainMessage()
    await ctx.replyWithHTML(`👍 <b>${ctx.session.data.card.name}</b> foi deletado com sucesso! Você recebeu <b>${money}</b> moedas.`)
    return
    // @ts-ignore
  } else if (ctx.message?.text?.startsWith?.('/cancel')) {
    ctx.session.steps.leave()
    await ctx.reply('Operação cancelada.')
    return
  }

  await ctx.reply('❌ Resposta inválida. Digite /cancelar ou o nome do card para ser deletado.')
}

export default new AdvancedScene('DELETE_CARD_ES2', [
  // @ts-ignore
  firstStep,
  // @ts-ignore
  secondStep
], ['message'])
