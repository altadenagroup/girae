import { CommonMessageBundle, User } from 'telegraf/types'
import { BotContext } from '../types/context.js'
import { getUserFromQuotesOrAt } from '../utilities/parser.js'
import { tcqc } from '../sessions/tcqc.js'
import { getCardFullByID } from '../utilities/engine/cards.js'
import { getHowManyCardsUserHas } from '../utilities/engine/users.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import {
  appendCards,
  cancelTrade,
  finishDMStage,
  finishTrade,
  getCards,
  getUserNumber,
  removeCard,
  setUserDone,
  setUserReady
} from '../scenes/start-trade.js'
import { MISSING_CARD_IMG } from '../constants.js'

export interface TradeContext extends BotContext {
  tradingWith: User
}

export default async (ctx: BotContext) => {
  if (!(ctx.message as CommonMessageBundle).reply_to_message) return ctx.responses.gottaQuote('quem você quer trocar suas cartas')
  const user = await getUserFromQuotesOrAt(ctx, ctx.args[0])
  if (!user) return ctx.responses.replyCouldNotFind('o usuário que você quer realizar a troca de cartas')
  if (user?.id === ctx.from!.id) return ctx.reply('Você não pode trocar cartas com você mesmo! 😅')
  if (user.is_bot) return ctx.reply('Você não pode trocar cartas com um bot! 😅')
  const nUser = await _brklyn.db.user.findFirst({ where: { tgId: user.id } })
  if (!nUser) return ctx.reply('O usuário mencionado nunca usou a bot! Talvez você marcou a pessoa errada?')
  if (nUser.isBanned && !process.env.JANET_VERSION) return ctx.reply('Esse usuário está banido de usar a Giraê e não pode realizar trocas de cartas.')
  const ecData = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  if (ecData?.tradingWith) return ctx.reply('Você já está em uma troca de cartas! 😅\nFinalize-a para trocar mais cartas.')
  const ecData2 = await _brklyn.es2.getEC(user.id, 'tradeData')
  if (ecData2?.tradingWith) return ctx.reply('Esse usuário já está em uma troca de cartas! 😅\nDeixe ele terminar para poder trocar com você.')
  // inline button that opens a private chat with the user
  return ctx.es2.enter('START_TRADE', { tradingWith: user })
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['trocar', 'troca']
}

export interface AddCardData {
  uid: number
  cid: number
}

tcqc.add<AddCardData>('add-card', async (ctx) => {
  const { cid } = ctx.data
  const ecData = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  if (!ecData) return ctx.answerCbQuery('Você não está em uma troca de cartas! 😅')
  const userCardCount = await getHowManyCardsUserHas(ctx.userData.id, cid)
  if (userCardCount === 0) return ctx.answerCbQuery('Você não tem essa carta! 😅')
  const userCards = await getCards(ctx)
  const card = await getCardFullByID(cid)
  if (!card) return ctx.reply('Essa carta não existe! 😅')
  // check if the user already has this card in the trade and, if so, if they have enough to trade
  const cardInTrade = userCards.find((card) => card.id === cid)
  if (cardInTrade?.count === userCardCount) return ctx.answerCbQuery(`Você não pode adicionar mais ${card.name}s à troca - você já colocou todos os que tem! 😅`)

  const cardData = {
    name: card.name,
    id: card.id,
    rarity: card.rarity.name,
    subcategory: card.subcategory?.name || '?',
    imageURL: parseImageString(card.image, undefined, true) || MISSING_CARD_IMG
  }
  const r = await appendCards(ctx, cardData)
  if (r === false) return ctx.answerCbQuery('Você só pode trocar 3 cards de uma vez! 😅')
  return ctx.answerCbQuery('Carta adicionada! 😄')
})

tcqc.add<AddCardData>('remove-card', async (ctx) => {
  const { cid } = ctx.data
  const ecData = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  if (!ecData) return ctx.answerCbQuery('Você não está em uma troca de cartas! 😅')
  const r = await removeCard(ctx, cid)
  if (r === false) return ctx.answerCbQuery('Essa carta não está na troca! 😅')
  return ctx.answerCbQuery('Carta removida! 😄')
})

tcqc.add<{}>('ready-trade', async (ctx) => {
  const ecData = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  if (!ecData) return ctx.answerCbQuery('Você não está em uma troca de cartas! 😅')
  const userNumber = await getUserNumber(ctx)
  const cards = await _brklyn.cache.get(`ongoing_trades_cards${userNumber}`, ecData)
  if (cards.length === 0) return ctx.answerCbQuery('Você não adicionou nenhuma carta! 😅')

  const canStart = await setUserReady(ctx, true)
  if (canStart) await finishDMStage(ecData)
  else return ctx.answerCbQuery(`Certo! Agora, aguarde o outro usuário ficar pronto. 😄`)
})

tcqc.add<{}>('cancel-trade', async (ctx) => {
  const ecData = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  if (!ecData) return ctx.answerCbQuery('Você não está em uma troca de cartas! 😅')
  await cancelTrade(ecData)
})

tcqc.add<{}>('finish-trade', async (ctx) => {
  const ecData = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  if (!ecData) return ctx.answerCbQuery('Você não está em uma troca de cartas! 😅')

  const r = await setUserDone(ctx, true)
  if (r) await finishTrade(ecData)
  else return ctx.answerCbQuery(`Certo! Agora, aguarde o outro usuário terminar a troca. 😄`)
})
