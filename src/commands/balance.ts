import { BotContext } from '../types/context.js'
import { getUserCardsCount } from '../utilities/engine/users.js'
import { addCommas, escapeForHTML } from '../utilities/responses.js'

export default async (ctx: BotContext) => {
  const cards = await getUserCardsCount(ctx.userData!.id)
  const text = `🏧 Finanças de <b>${escapeForHTML(ctx.from!.first_name)}</b>

💴 <b>Moedas</b>: ${addCommas(ctx.userData!.coins)}
🃏 <b>Cartas</b>: ${addCommas(cards)}
    `

  return ctx.replyWithHTML(text)
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['balanço', 'atm']

}
