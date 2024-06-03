import { BotContext } from '../types/context.js'
import { getCardFromArg } from '../utilities/parser.js'

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID do personagem a ser deletado', '/delete Anitta')
  // check if the joined args contain only numbeers
  if (ctx.args.every((arg) => !isNaN(Number(arg))) && ctx.args.length > 1) {
    const cards = await Promise.all(ctx.args.map((arg) => getCardFromArg(arg)))
    return ctx.es2.enter('DELETE_CONFIRM', { multipleCards: cards })
  }

  const char = await getCardFromArg(ctx.args.join(' '))
  if (!char) return ctx.responses.replyCouldNotFind('um personagem com esse nome ou ID')

  return ctx.es2.enter('DELETE_CONFIRM', { card: char })
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['delcard', 'del']
}
