import { SessionContext } from '../sessions/context.js'
import { AdvancedScene } from '../sessions/scene.js'
import { Card } from '@prisma/client'
import { formatCard } from '../constants.js'
import { escapeForHTML } from '../utilities/responses.js'

interface TradeData {
  card1: Card
  card1UserCardId: number
  card2: Card
  card2UserCardId: number
  user1: { name: string, id: number }
  user2: { name: string, id: number }
  _mainMessage: number
}

const firstStep = async () => {

}

const secondStep = async (ctx: SessionContext<TradeData>) => {
  let data = ctx.callbackQuery?.data
  if (data === 'CANCEL') {
    if ((ctx.from.id !== ctx.session.data.user1.id) && (ctx.from.id !== ctx.session.data.user2.id)) return ctx.answerCbQuery('Você não pode cancelar a troca, ela não é sua! 😅', { show_alert: true })
    ctx.session.steps.leave()
    await ctx.session.deleteMainMessage()
    return ctx.replyWithHTML(`Vish... <b>${ctx.from.first_name}</b> desistiu da troca. Será que se arrependeu? 😅`)
  } else if (data === 'CONFIRM') {
    if (ctx.from.id !== ctx.session.data.user2.id) return ctx.answerCbQuery('Você não pode confirmar a troca, ela não é pra você! 😅', { show_alert: true })

    ctx.session.steps.leave()

    const u1 = await _brklyn.db.user.findUnique({ where: { tgId: ctx.session.data.user1.id } })
    const u2 = await _brklyn.db.user.findUnique({ where: { tgId: ctx.session.data.user2.id } })

    // delete first card with matching id
    await _brklyn.db.$transaction([
      _brklyn.db.userCard.delete({ where: { id: ctx.session.data.card1UserCardId } }),
      _brklyn.db.userCard.delete({ where: { id: ctx.session.data.card2UserCardId } }),
      _brklyn.db.userCard.create({
        data: {
          cardId: ctx.session.data.card1.id,
          userId: u2!.id
        }
      }),
      _brklyn.db.userCard.create({
        data: {
          cardId: ctx.session.data.card2.id,
          userId: u1!.id
        }
      }),
      _brklyn.db.consumedTrade.create({
        data: {
          user1Id: u1!.id,
          user2Id: u2!.id,
          cardsUser1: [ctx.session.data.card1.id],
          cardsUser2: [ctx.session.data.card2.id]
        }
      })
    ])

    const text = `🎉 Troca realizada com sucesso!

🃏 <b>${escapeForHTML(ctx.session.data.user1.name)}</b> recebeu:

  ${formatCard(ctx.session.data.card2)}

🃏 <b>${escapeForHTML(ctx.session.data.user2.name)}</b> recebeu:

  ${formatCard(ctx.session.data.card1)}.`

    return _brklyn.telegram.editMessageCaption(ctx.chat!.id, ctx.session.data._mainMessage, undefined, text, {
      parse_mode: 'HTML'
    })
  }
}

// @ts-ignore
export default new AdvancedScene<TradeData>('CONFIRM_TRADE', [firstStep, secondStep])
