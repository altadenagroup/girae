import { ParseMode, User } from 'telegraf/types.js'
import { SessionContext } from '../sessions/context.js'
import { AdvancedScene } from '../sessions/scene.js'
import { cachedGetUserPhotoAndFile, getAvatarURL, launchStartURL, mentionUser } from '../utilities/telegram.js'
import { generateID } from '../utilities/misc.js'
import { BotContext } from '../types/context.js'
import { MEDAL_MAP } from '../constants.js'
import { tcqc } from '../sessions/tcqc.js'
import { fromReadableStream } from 'telegraf/typings/input.js'
import { debug } from 'melchior'

const ACCEPT_TRADE = 'accept_trade'
const DECLINE_TRADE = 'decline_trade'

interface TradeData {
  tradingWith: User
  ogUser: User
  _mainMessage: number
  chatId: number
  threadId: number
}

const firstStep = async (ctx: SessionContext<TradeData>) => {
  const user = ctx.session.arguments!.tradingWith as User
  ctx.session.setMessageToBeQuoted(ctx.message?.message_id)
  await ctx.session.attachUserToSession(user)
  ctx.session.data.tradingWith = user
  ctx.session.data.ogUser = ctx.from!
  ctx.session.data.chatId = ctx.chat!.id
  ctx.session.data.threadId = ctx.message?.message_thread_id || 0
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
    if (ctx.from?.id !== ctx.session.data.tradingWith.id) return ctx.answerCbQuery('Você não pode aceitar a troca por outra pessoa!', { show_alert: true })
    ctx.session.steps.leave()

    const photo1 = await cachedGetUserPhotoAndFile(ctx.session.data.ogUser.id)
    const photo2 = await cachedGetUserPhotoAndFile(ctx.session.data.tradingWith.id)

    const tradeID = generateID(12)
    await _brklyn.cache.set('ongoing_trades', tradeID, {
      id: tradeID,
      users: [ctx.session.data.ogUser.id, ctx.session.data.tradingWith.id],
      names: [ctx.session.data.ogUser.first_name, ctx.session.data.tradingWith.first_name],
      photos: [getAvatarURL(photo1), getAvatarURL(photo2)],
      msgToEdit: ctx.session.data._mainMessage,
      chatId: ctx.session.data.chatId,
      threadId: ctx.session.data.threadId || 1
    })
    await _brklyn.cache.set('ongoing_trades_cards1', tradeID, [])
    await _brklyn.cache.set('ongoing_trades_cards2', tradeID, [])
    await _brklyn.cache.set('ongoing_trades_isready1', tradeID, false)
    await _brklyn.cache.set('ongoing_trades_isready2', tradeID, false)

    await _brklyn.es2.setEC(ctx.session.data.ogUser.id, 'tradeData', tradeID)
    await _brklyn.es2.setEC(ctx.session.data.tradingWith.id, 'tradeData', tradeID)

    // starts the trade
    await ctx.editMessageText(`Hora de trocar, <b>${mentionUser(ctx.session.data.ogUser)}</b> e <b>${mentionUser(ctx.session.data.tradingWith)}</b>! 🤝\n\nCliquem no botão abaixo para inicar a troca.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💱 Iniciar troca', url: launchStartURL('trade', ctx.session.data.tradingWith.id) }]
        ]
      },
      parse_mode: 'HTML' as ParseMode
    })
  } else if (ctx.callbackQuery?.data === DECLINE_TRADE) {
    ctx.session.steps.leave()
    // declines the trade
    await ctx.reply(`A troca foi entre vocês foi ${ctx.from?.id !== ctx.session.data.tradingWith?.id ? 'cancelada' : 'recusada'}. 😢`)
    await ctx.session.deleteMainMessage()
  }

  return
}

export const getUserNumber = async (ctx: BotContext) => {
  // get the ec data, fetch the session and then figure out the user index in the users array
  const tradeID = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  const tradeData = await _brklyn.cache.get('ongoing_trades', tradeID)
  const userIndex = tradeData.users.indexOf(ctx.from.id)
  return userIndex + 1
}

export const setUserDisplayMessageID = async (ctx: BotContext, messageID: number) => {
  const tradeID = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  const userNumber = await getUserNumber(ctx)
  await _brklyn.cache.set(`ongoing_trades_display_message${userNumber}`, tradeID, messageID)
}

const mention = (name: string, id: number) => `<a href="tg://user?id=${id}">${name}</a>`
const formatCard = (c) => MEDAL_MAP[c.rarity] +` <code>${c.id}</code>. <b>${c.name}</b> (${c.subcategory})`

export const updateDisplayMessages = async (tradeID: string) => {
  // get the cards, the session and the display mesage ids
  const trade = await _brklyn.cache.get('ongoing_trades', tradeID)
  const cards1 = await _brklyn.cache.get('ongoing_trades_cards1', tradeID)
  const cards2 = await _brklyn.cache.get('ongoing_trades_cards2', tradeID)
  const displayMessageID1 = await _brklyn.cache.get(`ongoing_trades_display_message1`, tradeID)
  const displayMessageID2 = await _brklyn.cache.get(`ongoing_trades_display_message2`, tradeID)
  const text = `
💱 Troca entre <b>${mention(trade.names[0], trade.users[0])}</b> e <b>${mention(trade.names[1], trade.users[1])}</b>

🃏 <b>${trade.names[0]}</b> está oferecendo:

  ${cards1.map(formatCard).join('\n  ') || '<i>Nenhum card até agora.</i>'}

🃏 <b>${trade.names[1]}</b> está oferecendo:

  ${cards2.map(formatCard).join('\n  ') || '<i>Nenhum card até agora.</i>'}

Quando estiverem prontos, cliquem no botão abaixo.
Para cancelar, use /cancelar.
  `
  const imgURL = await _brklyn.generateImage('trade', {
    user1: { avatarURL: trade.photos[0], cards: cards1.map(t => t.imageURL), name: trade.names[0] },
    user2: { avatarURL: trade.photos[1], cards: cards2.map(t => t.imageURL), name: trade.names[1] }
  })

  const msgData = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🤝 Estou pronto', callback_data: tcqc.generateCallbackQuery('ready-trade', {}) }]
      ]
    }
  }

  await _brklyn.telegram.editMessageMedia(trade.users[0], displayMessageID1, undefined, {
    type: 'photo',
    media: imgURL.url,
    caption: text,
    parse_mode: 'HTML' as ParseMode
  }, msgData).catch(() => undefined)
  await _brklyn.telegram.editMessageMedia(trade.users[1], displayMessageID2, undefined, {
    type: 'photo',
    media: imgURL.url,
    caption: text,
    parse_mode: 'HTML' as ParseMode
  }, msgData).catch(() => undefined)
}

export const setUserReady = async (ctx: BotContext, ready: boolean): Promise<boolean> => {
  const tradeID = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  const userNumber = await getUserNumber(ctx)
  await _brklyn.cache.set(`ongoing_trades_isready${userNumber}`, tradeID, ready)
  const isReady1 = await _brklyn.cache.get('ongoing_trades_isready1', tradeID)
  const isReady2 = await _brklyn.cache.get('ongoing_trades_isready2', tradeID)
  if (isReady1 && isReady2) {
    return true
  }
  return false
}

const sessionsBeingUpdated = new Set<string>()

export const appendCards = async (ctx: BotContext, card: any) => {
  const tradeID = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  const userNumber = await getUserNumber(ctx)
  const cards = await _brklyn.cache.get(`ongoing_trades_cards${userNumber}`, tradeID)
  if (cards.length >= 3) return false
  cards.push(card)
  await _brklyn.cache.set(`ongoing_trades_cards${userNumber}`, tradeID, cards)
  // if this session is already being updated, wait 1s and try again
  if (sessionsBeingUpdated.has(tradeID)) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  sessionsBeingUpdated.add(tradeID)
  await updateDisplayMessages(tradeID)
  sessionsBeingUpdated.delete(tradeID)
}

export const finishDMStage = async (tradeID: string) => {
  // get both messages and edit them telling to go back to the chat to finish the trade
  const trade = await _brklyn.cache.get('ongoing_trades', tradeID)
  const displayMessageID1 = await _brklyn.cache.get(`ongoing_trades_display_message1`, tradeID)
  const displayMessageID2 = await _brklyn.cache.get(`ongoing_trades_display_message2`, tradeID)
  const msgData = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Voltar à mensagem', url: `https://t.me/c/${trade.chatId.toString().replace('-100', '')}/${trade.threadId}/${trade.msgToEdit}` }]
      ]
    },
    parse_mode: 'HTML' as ParseMode
  }

  await _brklyn.telegram.editMessageText(trade.users[0], displayMessageID1, undefined, `Agora que vocês escolheram seus cards, cliquem no botão abaixo para voltar ao chat e finalizar sua troca.`, msgData)
  await _brklyn.telegram.editMessageText(trade.users[1], displayMessageID2, undefined, `Agora que vocês escolheram seus cards, cliquem no botão abaixo para voltar ao chat e finalizar sua troca.`, msgData)

  const cards1 = await _brklyn.cache.get('ongoing_trades_cards1', tradeID)
  const cards2 = await _brklyn.cache.get('ongoing_trades_cards2', tradeID)

  // now, edit the main message with the trade text
  const text = `💱 Troca entre <b>${mention(trade.names[0], trade.users[0])}</b> e <b>${mention(trade.names[1], trade.users[1])}</b>

🃏 <b>${trade.names[0]}</b> está oferecendo:

  ${cards1.map(formatCard).join('\n  ') || '<i>Nenhum card até agora.</i>'}

🃏 <b>${trade.names[1]}</b> está oferecendo:

  ${cards2.map(formatCard).join('\n  ') || '<i>Nenhum card até agora.</i>'}

Cliquem em <b>✅ Finalizar troca</b> para finalizar a troca, ou <b>❌ Cancelar</b> para cancelar a troca.
Atenção: a troca será desfeita caso um dos usuários clique em cancelar. Preste atenção!
    `

    const imgURL = await _brklyn.generateImage('trade', {
      user1: { avatarURL: trade.photos[0], cards: cards1.map(t => t.imageURL), name: trade.names[0] },
      user2: { avatarURL: trade.photos[1], cards: cards2.map(t => t.imageURL), name: trade.names[1] }
    })

  await _brklyn.telegram.editMessageMedia(trade.chatId, trade.msgToEdit, undefined, {
    type: 'photo',
    media: imgURL.url,
    caption: text,
    parse_mode: 'HTML' as ParseMode
  }, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Finalizar troca', callback_data: tcqc.generateCallbackQuery('finish-trade', {}) }, { text: '❌ Cancelar', callback_data: tcqc.generateCallbackQuery('cancel-trade', {}) }]
      ]
    }
  })
}

export const clearTradeData = async (tradeID: string) => {
  const trade = await _brklyn.cache.get('ongoing_trades', tradeID)
  await _brklyn.cache.del('ongoing_trades', tradeID)
  await _brklyn.cache.del('ongoing_trades_cards1', tradeID)
  await _brklyn.cache.del('ongoing_trades_cards2', tradeID)
  await _brklyn.es2.delEC(trade.users[0], 'tradeData')
  await _brklyn.es2.delEC(trade.users[1], 'tradeData')
  await _brklyn.cache.del(`ongoing_trades_display_message1`, tradeID)
  await _brklyn.cache.del(`ongoing_trades_display_message2`, tradeID)
  await _brklyn.cache.del('ongoing_trades_isready1', tradeID)
  await _brklyn.cache.del('ongoing_trades_isready2', tradeID)
  await _brklyn.cache.del('ongoing_trades_isdone1', tradeID)
  await _brklyn.cache.del('ongoing_trades_isdone2', tradeID)
}

export const finishTrade = async (tradeID: string) => {
  const trade = await _brklyn.cache.get('ongoing_trades', tradeID)
  const cards1 = await _brklyn.cache.get('ongoing_trades_cards1', tradeID)
  const cards2 = await _brklyn.cache.get('ongoing_trades_cards2', tradeID)

  const text = `💱 Troca entre <b>${mention(trade.names[0], trade.users[0])}</b> e <b>${mention(trade.names[1], trade.users[1])}</b> FINALIZADA! ✅

🃏 <b>${trade.names[0]}</b> ofereceu:

  ${cards1.map(formatCard).join('\n  ') || '<i>Nenhum card.</i>'}

🃏 <b>${trade.names[1]}</b> ofereceu:

    ${cards2.map(formatCard).join('\n  ') || '<i>Nenhum card.</i>'}`

  await _brklyn.telegram.deleteMessage(trade.chatId, trade.msgToEdit)

  const adds = {}
  if (trade.threadId !== 1) {
    debug('finishTrade', 'threadId is ' + trade.threadId)
    adds['message_thread_id'] = trade.threadId
  }

  // transfer the cards between the accounts
  // get the userCard id for each of the cards
  const cardIds1 = cards1.map((c) => c.id)
  // group repeated cards
  const cardGroups1 = cardIds1.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1
    return acc
  }, {})
  const cardIds2 = cards2.map((c) => c.id)
  const cardGroups2 = cardIds2.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1
    return acc
  }, {})

  // get the user id based on the tg id
  const user1 = await _brklyn.db.user.findUnique({
    where: {
      tgId: trade.users[0]
    }
  })

  const user2 = await _brklyn.db.user.findUnique({
    where: {
      tgId: trade.users[1]
    }
  })

  let userCardsIds1: number[] = []
  let userCardsIds2: number[] = []

  // iterate through the groups and transfer the cards
  for (const id in cardGroups1) {
    const cards = await _brklyn.db.userCard.findMany({
      where: {
        userId: user1!.id,
        cardId: parseInt(id)
      },
      take: cardGroups1[id]
    })

    // check if the count matches. if it doesn't, cancel
    if (cards.length !== cardGroups1[id]) {
      await _brklyn.telegram.sendMessage(trade.chatId, `Não foi possível completar a troca porquê ${mention(trade.names[0], trade.users[0])} não tem todos os cards que ofereceu. Que tenso!`, {
        parse_mode: 'HTML' as ParseMode,
        ...adds
      })

      await clearTradeData(tradeID)
      return
    }

    userCardsIds1 = userCardsIds1.concat(cards.map((c) => c.id))
  }

  for (const id in cardGroups2) {
    const cards = await _brklyn.db.userCard.findMany({
      where: {
        userId: user2!.id,
        cardId: parseInt(id)
      },
      take: cardGroups2[id]
    })

    if (cards.length !== cardGroups2[id]) {
      await _brklyn.telegram.sendMessage(trade.chatId, `Não foi possível completar a troca porquê ${mention(trade.names[1], trade.users[1])} não tem todos os cards que ofereceu. Que tenso!`, {
        parse_mode: 'HTML' as ParseMode,
        ...adds
      })

      await clearTradeData(tradeID)
      return
    }

    userCardsIds2 = userCardsIds2.concat(cards.map((c) => c.id))
  }

  // delete user1 cards and user2
  await _brklyn.db.userCard.deleteMany({
    where: {
      id: {
        in: [...userCardsIds1, ...userCardsIds2]
      }
    }
  })

  // create new userCards. we can just get the keys from the cardGroups
  type CardGroup = { userId: number, cardId: number }
  let newCards1: CardGroup[] = []
  // we have to take into consideration that the cards might be repeated
  for (const id in cardGroups2) {
    newCards1 = newCards1.concat(Array(cardGroups2[id]).fill({
      userId: user1!.id,
      cardId: parseInt(id)
    }))
  }

  let newCards2: CardGroup[] = []
  for (const id in cardGroups1) {
    newCards2 = newCards2.concat(Array(cardGroups1[id]).fill({
      userId: user2!.id,
      cardId: parseInt(id)
    }))
  }

  await _brklyn.db.userCard.createMany({
    data: [...newCards1, ...newCards2]
  })

  const imgURL = await _brklyn.generateImage('trade', {
    user1: { avatarURL: trade.photos[0], cards: cards1.map(t => t.imageURL), name: trade.names[0] },
    user2: { avatarURL: trade.photos[1], cards: cards2.map(t => t.imageURL), name: trade.names[1] }
  })

  await _brklyn.telegram.sendPhoto(trade.chatId, imgURL.url, {
    caption: text,
    parse_mode: 'HTML' as ParseMode,
    ...adds
  })

  await clearTradeData(tradeID)
}

export const cancelTrade = async (tradeID: string) => {
  const trade = await _brklyn.cache.get('ongoing_trades', tradeID)
  await _brklyn.telegram.deleteMessage(trade.chatId, trade.msgToEdit)
  const text = `😬 Vish... ${mention(trade.names[0], trade.users[0])} e ${mention(trade.names[1], trade.users[1])} cancelaram a troca de última hora. Brigaram?`
  const adds = {}
  if (trade.threadId !== 1) {
    adds['message_thread_id'] = trade.threadId
  }
  await _brklyn.telegram.sendMessage(trade.chatId, text, {
    parse_mode: 'HTML' as ParseMode,
    ...adds
  })

  await clearTradeData(tradeID)
}

export const setUserDone = async (ctx: BotContext, done: boolean): Promise<boolean> => {
  const tradeID = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  const userNumber = await getUserNumber(ctx)
  await _brklyn.cache.set(`ongoing_trades_isdone${userNumber}`, tradeID, done)
  const isDone1 = await _brklyn.cache.get('ongoing_trades_isdone1', tradeID)
  const isDone2 = await _brklyn.cache.get('ongoing_trades_isdone2', tradeID)
  if (isDone1 && isDone2) {
    return true
  }
  return false
}

// @ts-ignore
export default new AdvancedScene<TradeData>('START_TRADE', [firstStep, secondStep])
