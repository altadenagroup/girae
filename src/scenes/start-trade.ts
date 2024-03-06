import { Composer, Scenes } from 'telegraf'
import { User } from 'telegraf/types'
import { addUserToSession } from '../utilities/session-store.js'
import { mentionUser } from '../utilities/telegram.js'
import { WizardContext, WizardContextWizard, WizardSessionData } from 'telegraf/typings/scenes/index.js'

interface TradeContext extends WizardContext {
  wizard: WizardContextWizard<WizardContext<WizardSessionData>> & {
    state: {
      tradingWith: User
      msgId: number
    }
  }
}

const scene = new Composer<TradeContext>()

const ACCEPT_TRADE = 'ACCEPT_TRADE'
const DECLINE_TRADE = 'DECLINE_TRADE'

scene.action(ACCEPT_TRADE, async (ctx) => {
  console.log(ctx)
  if (ctx.from?.id !== ctx.wizard.state.tradingWith.id) return
  // starts the trade

  await ctx.reply('fds')
  return ctx.scene.leave()
})

scene.action(DECLINE_TRADE, async (ctx) => {
  // declines the trade
  ctx.reply(`A troca foi entre vocês foi ${ctx.from?.id !== ctx.wizard.state.tradingWith.id ? 'cancelada' : 'recusada'}. 😢`)

  await ctx.telegram.deleteMessage(ctx.chat?.id!, ctx.wizard.state.msgId)
  return ctx.scene.leave()
})

// @ts-ignore
export default new Scenes.WizardScene<TradeContext>('START_TRADE', async (ctx) => {
  // @ts-ignore
  const tradingWith = ctx.scene.session.state?.tradingWith as User
  // asks the mentioned user if they want to trade.
  // if they do, it will start a trade with the user.
  await addUserToSession(ctx, tradingWith)
  const mention = mentionUser(tradingWith)
  const m = await ctx.replyWithHTML(`<b>${mention}</b>, você quer trocar cartas com <b>${ctx.from!.first_name}</b>?\n\n<b>${ctx.from!.first_name}</b>, você ainda pode cancelar clicando em recusar!`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Aceitar', callback_data: ACCEPT_TRADE }, { text: '❌ Recusar', callback_data: DECLINE_TRADE }]
      ]
    }
  })

  ctx.wizard.state.msgId = m.message_id
  ctx.wizard.state.tradingWith = tradingWith
  return ctx.wizard.next()
}, scene)
