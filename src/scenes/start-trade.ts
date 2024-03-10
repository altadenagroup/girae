import { User } from 'telegraf/types.js'
import { SessionContext } from '../sessions/context.js'
import { AdvancedScene } from '../sessions/scene.js'
import { mentionUser } from '../utilities/telegram.js'

const ACCEPT_TRADE = 'accept_trade'
const DECLINE_TRADE = 'decline_trade'

interface TradeData {
  tradingWith: User
}

const firstStep = async (ctx: SessionContext<TradeData>) => {
  const user = ctx.session.arguments!.tradingWith as User
  await ctx.session.attachUserToSession(user)
  ctx.session.data.tradingWith = user
  ctx.session.steps.next()

  return ctx.replyWithHTML(`<b>${mentionUser(user)}</b>, você quer trocar cartas com <b>${ctx.from!.first_name}</b>?\n\n<b>${ctx.from!.first_name}</b>, você ainda pode cancelar clicando em recusar!`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Aceitar', callback_data: ACCEPT_TRADE }, { text: '❌ Recusar', callback_data: DECLINE_TRADE }]
      ]
    }
  }).then((t) => ctx.session.setMainMessage(t.message_id))
}

const secondStep = async (ctx: SessionContext<TradeData>) => {
  if (ctx.callbackQuery?.data === ACCEPT_TRADE) {
    if (ctx.from?.id !== ctx.session.data.tradingWith.id) return
    // starts the trade
    await ctx.session.deleteMainMessage()
    await ctx.reply('fds')
  } else {
    // declines the trade
    ctx.reply(`A troca foi entre vocês foi ${ctx.from?.id !== ctx.session.data.tradingWith?.id ? 'cancelada' : 'recusada'}. 😢`)
    await ctx.session.deleteMainMessage()
  }

  return ctx.session.steps.leave()
}

export default new AdvancedScene<TradeData>('START_TRADE', [firstStep, secondStep])
