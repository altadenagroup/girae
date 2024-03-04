import { Scenes } from 'telegraf'
import { TradeContext } from '../commands/trade.js'
import { User } from 'telegraf/types'
import { addUserToSession } from '../utilities/session-store.js'

const scene = new Scenes.BaseScene<TradeContext>('START_TRADE')

const ACCEPT_TRADE = 'ACCEPT_TRADE'
const DECLINE_TRADE = 'DECLINE_TRADE'

scene.enter(async (ctx) => {
  // @ts-ignore
  const tradingWith = ctx.scene.session.state?.tradingWith as User
  // asks the mentioned user if they want to trade.
  // if they do, it will start a trade with the user.
  await addUserToSession(ctx, tradingWith)
  const m = await ctx.replyWithHTML(`<b>${tradingWith.first_name}</b>, você quer trocar cartas com <b>${ctx.from!.first_name}</b>?\n\n<b>${ctx.from!.first_name}</b>, você ainda pode cancelar clicando em recusar!`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Aceitar', callback_data: ACCEPT_TRADE }, { text: '❌ Recusar', callback_data: DECLINE_TRADE }]
      ]
    }
  })

  // @ts-ignore
  ctx.scene.session.state.msgId = m.message_id
})

scene.action(ACCEPT_TRADE, async (ctx) => {
  if (ctx.user.id !== ctx.scene.session.state.tradingWith.id) {
    return ctx.reply('Você não pode aceitar a troca por outra pessoa. Espere.')
  }
  // starts the trade
  ctx.scene.leave()
  await ctx.reply('fds')
  return
})

scene.action(DECLINE_TRADE, async (ctx) => {
  // declines the trade
  ctx.reply('A troca foi entre vocês foi recusada. 😢')
  // @ts-ignore
  await ctx.telegram.deleteMessage(ctx.chat?.id, ctx.scene.session.state.msgId)
  ctx.scene.leave()
})

export default scene
