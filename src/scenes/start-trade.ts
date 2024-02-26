import { Scenes } from 'telegraf'
import { TradeContext } from '../commands/trade.js'

const scene = new Scenes.BaseScene<TradeContext>('START_TRADE')

const ACCEPT_TRADE = 'ACCEPT_TRADE'
const DECLINE_TRADE = 'DECLINE_TRADE'

scene.enter(async (ctx) => {
  // asks the mentioned user if they want to trade.
  // if they do, it will start a trade with the user.
  const m = await ctx.replyWithHTML(`${ctx.tradingWith.first_name}, você quer trocar cartas com ${ctx.from!.first_name}?`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Aceitar', callback_data: ACCEPT_TRADE }, { text: '❌ Recusar', callback_data: DECLINE_TRADE }]
      ]
    }
  })

  // @ts-ignore
  ctx.wizard.state = { msgId: m.message_id }
})

scene.action(ACCEPT_TRADE, async (ctx) => {
  // starts the trade
  ctx.scene.leave()
  ctx.scene.enter('TRADE')
})

scene.action(DECLINE_TRADE, async (ctx) => {
  // declines the trade
  ctx.reply('A troca foi entre vocês foi recusada. 😢')
  // @ts-ignore
  await ctx.telegram.deleteMessage(ctx.chat?.id, ctx.wizard.state.msgId)
  ctx.scene.leave()
})

export default scene
