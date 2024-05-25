import { CommonMessageBundle } from 'telegraf/types'
import { BotContext } from '../types/context.js'
import { getUserFromQuotesOrAt } from '../utilities/parser.js'
import { getCardFullByID } from '../utilities/engine/cards.js'
import { tcqc } from '../sessions/tcqc.js'
import { escapeForHTML } from '../utilities/responses.js'
import { formatCard } from '../constants.js'
import { generateID } from '../utilities/misc.js'
import { Card } from '@prisma/client'
import { parseImageString } from '../utilities/lucky-engine.js'
import { mentionUser } from '../utilities/telegram.js'

const createTradeCache = (data: TradeData) => {
  const id = generateID(16)
  return _brklyn.cache.set('quick_trades', id, data).then(() => id)
}

const updateTradeCache = (id: string, data: TradeData) => {
  return _brklyn.cache.set('quick_trades', id, data)
}

const deleteTradeCache = (id: string) => {
  return _brklyn.cache.del('quick_trades', id)
}

const getTradeCache = (id: string) => {
  return _brklyn.cache.get('quick_trades', id) as Promise<TradeData>
}

interface TradeData {
  card1: Card
  card1UserCardId: number
  card2: Card
  card2UserCardId: number
  user1: { name: string, id: string }
  user2: { name: string, id: string }
  _mainMessage: number
}

export default async (ctx: BotContext) => {
  if (ctx.chat?.type === 'private') return ctx.reply('Esse comando só pode ser usado em grupos!')
  // const config = await getOrCreateGroupConfig(ctx.chat!.id)
  // if (!config.allowSimpleTrade && !ctx.userData.isAdmin && !ctx.userData.isPremium) return ctx.reply('Esse grupo não tem permissão para realizar trocas simples. Sinto muito! 😅\n\nQuer usar o /strade em todos grupos? Doe para a Giraê e receba isso e mais! Use /doar para mais informações.')

  if (!(ctx.message as CommonMessageBundle).reply_to_message) return ctx.reply('Você precisa responder a uma mensagem de um usuário para trocar cartas com ele. Do mesmo jeito que fiz nessa mensagem aqui! 😊')
  const user = await getUserFromQuotesOrAt(ctx, '')
  if (!user) return ctx.responses.replyCouldNotFind('o usuário que você quer realizar a troca de cartas')
  if (user?.id === ctx.from!.id) return ctx.reply('Você não pode trocar cartas com você mesmo! 😅')
  if (user.is_bot) return ctx.reply('Você não pode trocar cartas com um bot! 😅')
  if (!ctx.args[0] || !ctx.args[1]) {
    return ctx.reply('Você precisa especificar duas cartas para trocar.\n\nUsa-se /stroca carta1 carta2.')
  }

  const nUser = await _brklyn.db.user.findFirst({ where: { tgId: user.id } })
  if (!nUser) {
    return ctx.reply('O usuário mencionado nunca usou a bot! Talvez você marcou a pessoa errada?')
  }
  if (nUser.isBanned && !process.env.JANET_VERSION) {
    return ctx.reply('Esse usuário está banido de usar a Giraê e não pode realizar trocas de cartas.')
  }

  // arg[0] is the card they wanna trade and arg[1] is the card they wanna receive from the user
  const card1 = await getCardFullByID(parseInt(ctx.args[0]))
  const card2 = await getCardFullByID(parseInt(ctx.args[1]))

  if (!card1 || !card2) {
    const missingCard = !card1 ? 'o card que você quer trocar' : (!card2 ? 'o card que você quer receber' : 'nenhum dos cards')
    return ctx.reply(`Não foi possível encontrar ${missingCard}. Corriga o ID e tente novamente.`)
  }

  // check if users have the cards they want to trade
  const userCardCount1 = await _brklyn.db.userCard.findFirst({ where: { userId: ctx.userData.id, cardId: card1.id } })
  if (!userCardCount1) {
    return ctx.replyWithHTML(`Você não tem nenhum card de <b>${card1.name}</b> para trocar!`)
  }

  const userCardCount2 = await _brklyn.db.userCard.findFirst({ where: { userId: nUser.id, cardId: card2.id } })
  if (!userCardCount2) {
    return ctx.replyWithHTML(`O usuário mencionado não tem nenhum card de <b>${card2.name}</b> para trocar!`)
  }

  const card1URL = parseImageString(card1.image, 'ar_3:4,c_crop')
  const card2URL = parseImageString(card2.image, 'ar_3:4,c_crop')
  const user1 = { name: ctx.from.first_name, id: ctx.from.id }
  const user2 = { name: user.first_name, id: user.id }
  let dittoData = await _brklyn.ditto.generateTrade(user1, user2, [card1URL], [card2URL])

  const text = `💱 Troca entre <b>${mentionUser(ctx.from)}</b> e <b>${mentionUser(user)}</b>

🃏 <b>${user1.name}</b> está oferecendo:

  ${formatCard(card1)}

🃏 <b>${user2.name}</b> está oferecendo:

  ${formatCard(card2)}

Cliquem em <b>✅ Confirmar</b> para finalizar a troca, ou <b>❌ Cancelar</b> para cancelar a troca.
Atenção: a troca será desfeita caso um dos usuários clique em cancelar. Preste atenção!
    `

  const data = {
    card1,
    card1UserCardId: userCardCount1.id,
    card2,
    card2UserCardId: userCardCount2.id,
    user1: { name: user1.name, id: user1.id.toString() },
    user2: { name: user2.name, id: user2.id.toString() },
    _mainMessage: 0
  } as TradeData

  const tradeID = await createTradeCache(data)
  return ctx.replyWithPhoto(dittoData.url, {
    caption: text,
    reply_markup: {
      inline_keyboard: [
        [{
          text: '✅ Confirmar',
          callback_data: tcqc.generateCallbackQuery('qt.confirm', { tradeID })
        }, {
          text: '❌ Cancelar',
          callback_data: tcqc.generateCallbackQuery('qt.cancel', { tradeID })
        }]
      ]
    },
    parse_mode: 'HTML'
  }).then((t) => {
    return updateTradeCache(tradeID, { ...data, _mainMessage: t.message_id })
  })
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['strocar', 'stroca']
}

tcqc.add<{ tradeID: string }>('qt.confirm', async (ctx) => {
  const { tradeID } = ctx.data
  const data = await getTradeCache(tradeID)
  if (!data) return ctx.answerCbQuery('Essa troca não existe mais! 😅\nRealize-a novamente.', { show_alert: true })

  if (ctx.from.id.toString() !== data.user2.id) return ctx.answerCbQuery('Você não pode confirmar a troca, ela não é pra você! 😅', { show_alert: true })

  const u1 = await _brklyn.db.user.findUnique({ where: { tgId: parseInt(data.user1.id) } })
  const u2 = await _brklyn.db.user.findUnique({ where: { tgId: parseInt(data.user2.id) } })

  // count if they still have the cards
  const userCardCount1 = await _brklyn.db.userCard.findFirst({ where: { userId: u1!.id, cardId: data.card1.id } })
  const userCardCount2 = await _brklyn.db.userCard.findFirst({ where: { userId: u2!.id, cardId: data.card2.id } })
  if (!userCardCount1) {
    await _brklyn.telegram.deleteMessage(ctx.chat!.id, data._mainMessage).catch(() => 0)
    await deleteTradeCache(tradeID)
    return ctx.answerCbQuery(`Vish... <b>${data.user1.name}</b> não tem mais a carta que queria trocar! 😅`, { show_alert: true })
  }
  if (!userCardCount2) {
    await _brklyn.telegram.deleteMessage(ctx.chat!.id, data._mainMessage).catch(() => 0)
    await deleteTradeCache(tradeID)
    return ctx.answerCbQuery(`Vish... você não tem mais a carta que queria trocar! 😅`, { show_alert: true })
  }

  // delete first card with matching id
  await _brklyn.db.$transaction([
    _brklyn.db.userCard.delete({ where: { id: userCardCount1.id } }),
    _brklyn.db.userCard.delete({ where: { id: userCardCount2.id } }),
    _brklyn.db.userCard.create({
      data: {
        cardId: data.card1.id,
        userId: u2!.id
      }
    }),
    _brklyn.db.userCard.create({
      data: {
        cardId: data.card2.id,
        userId: u1!.id
      }
    }),
    _brklyn.db.consumedTrade.create({
      data: {
        user1Id: u1!.id,
        user2Id: u2!.id,
        cardsUser1: [data.card1.id],
        cardsUser2: [data.card2.id]
      }
    })
  ])

  const text = `🎉 Troca realizada com sucesso!

🃏 <b>${escapeForHTML(data.user1.name)}</b> recebeu:

  ${formatCard(data.card2)}

🃏 <b>${escapeForHTML(data.user2.name)}</b> recebeu:

  ${formatCard(data.card1)}`

  await deleteTradeCache(tradeID)

  return _brklyn.telegram.editMessageCaption(ctx.chat!.id, data._mainMessage, undefined, text, {
    parse_mode: 'HTML'
  })
})

tcqc.add<{ tradeID: string }>('qt.cancel', async (ctx) => {
  const { tradeID } = ctx.data
  const data = await getTradeCache(tradeID)
  if (!data) return ctx.answerCbQuery('Essa troca não existe mais! 😅\nRealize-a novamente.', { show_alert: true })

  if (ctx.from.id.toString() !== data.user1.id && ctx.from.id.toString() !== data.user2.id) {
    return ctx.answerCbQuery('Você não pode cancelar a troca, ela não é sua! 😅', { show_alert: true })
  }

  await _brklyn.telegram.deleteMessage(ctx.chat!.id, data._mainMessage).catch(() => 0)
  await deleteTradeCache(tradeID)
  await ctx.replyWithHTML(`Vish... <b>${ctx.from.first_name}</b> desistiu da troca. Será que se arrependeu? 😅`)
  return ctx.answerCbQuery('Troca cancelada! 😄')
})
