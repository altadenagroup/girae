import { SessionContext } from '../sessions/context.js'
import { AdvancedScene } from '../sessions/scene.js'
import { Card } from '@prisma/client'
import { parseImageString } from '../utilities/lucky-engine.js'
import { formatCard } from '../constants.js'
import { mentionUser } from '../utilities/telegram.js'
import { escapeForHTML } from '../utilities/responses.js'
import { getUserFromQuotesOrAt } from '../utilities/parser.js'

interface TradeData {
  card1: Card
  card1UserCardId: number
  card2: Card
  card2UserCardId: number
  user1: { name: string, id: number }
  user2: { name: string, id: number }
}

const firstStep = async (ctx: SessionContext<TradeData>) => {
  const user = await getUserFromQuotesOrAt(ctx, '')
  await ctx.session.attachUserToSession(user!)
  ctx.session.setMessageToBeQuoted(ctx.message?.message_id)

  const card1 = ctx.session.arguments!.card1 as Card
  const card2 = ctx.session.arguments!.card2 as Card
  const user1 = ctx.session.arguments!.user1 as any
  const user2 = ctx.session.arguments!.user2 as any
  const ucid1 = ctx.session.arguments!.ucid1 as number
  const ucid2 = ctx.session.arguments!.ucid2 as number

  
  ctx.session.steps.next()
  ctx.session.data.card1 = card1
  ctx.session.data.card2 = card2
  ctx.session.data.user1 = user1
  ctx.session.data.user2 = user2
  ctx.session.data.card1UserCardId = ucid1
  ctx.session.data.card2UserCardId = ucid2

  const card1URL = parseImageString(card1.image, 'ar_3:4,c_crop')
  const card2URL = parseImageString(card2.image, 'ar_3:4,c_crop')

  // @ts-ignore
  let dittoData = await _brklyn.ditto.generateTrade(user1, user2, [card1URL], [card2URL])


  const text = `💱 Troca entre <b>${mentionUser(user1)}</b> e <b>${mentionUser(user2)}</b>

🃏 <b>${user1.name}</b> está oferecendo ${formatCard(card1)}
🃏 <b>${user2.name}</b> está oferecendo ${formatCard(card2)}

Cliquem em <b>✅ Confirmar</b> para finalizar a troca, ou <b>❌ Cancelar</b> para cancelar a troca.
Atenção: a troca será desfeita caso um dos usuários clique em cancelar. Preste atenção!
    `

  return ctx.replyWithPhoto(dittoData.url, {
    caption: text,
    reply_markup: {
      inline_keyboard: [
        [{
          text: '✅ Confirmar',
          callback_data: 'CONFIRM'
        }],
        [{
          text: '❌ Cancelar',
          callback_data: 'CANCEL'
        }]
      ]
    },
    parse_mode: 'HTML'
  }).then((t) => ctx.session.setMainMessage(t.message_id))
}

const secondStep = async (ctx: SessionContext<TradeData>) => {
  const data = ctx.callbackQuery?.data
  if (data === 'CANCEL') {
    ctx.session.steps.leave()
    await ctx.session.deleteMainMessage()
    return ctx.replyWithHTML(`Vish... <b>${ctx.from.first_name}</b> desistiu da troca. Será que se arrependeu? 😅`)
  } else if (data !== 'CONFIRM') {
    if (ctx.from.id !== ctx.session.data.user2.id) return ctx.answerCbQuery('Você não pode confirmar a troca, ela não é pra você! 😅', { show_alert: true })

    ctx.session.steps.leave()
    // delete first card with matching id
    await _brklyn.db.$transaction([
      _brklyn.db.userCard.delete({ where: { id: ctx.session.data.card1UserCardId } }),
      _brklyn.db.userCard.delete({ where: { id: ctx.session.data.card2UserCardId } })
    ])

    // now add cards
    await _brklyn.db.$transaction([
      _brklyn.db.userCard.create({
        data: {
          cardId: ctx.session.data.card1.id,
          userId: ctx.session.data.user2.id
        }
      }),
      _brklyn.db.userCard.create({
        data: {
          cardId: ctx.session.data.card2.id,
          userId: ctx.session.data.user1.id
        }
      }),
      _brklyn.db.consumedTrade.create({
        data: {
          user1Id: ctx.session.data.user1.id,
          user2Id: ctx.session.data.user2.id,
          cardsUser1: [ctx.session.data.card1.id],
          cardsUser2: [ctx.session.data.card2.id]
        }
      })
    ])

    const text = `🎉 Troca realizada com sucesso!

<b>${escapeForHTML(ctx.session.data.user1.name)}</b> recebeu ${formatCard(ctx.session.data.card2)}; e,
<b>${escapeForHTML(ctx.session.data.user2.name)}</b> recebeu ${formatCard(ctx.session.data.card1)}.`

    return _brklyn.telegram.editMessageCaption(ctx.chat!.id, ctx.session.data._mainMessage, undefined, text, {
      parse_mode: 'HTML'
    })
  }
}

// @ts-ignore
export default new AdvancedScene<TradeData>('CONFIRM_TRADE', [firstStep, secondStep])
