import { BotContext } from "../types/context.js"
import { getCardFromArg } from "../utilities/parser.js"

export default async (ctx: BotContext) => {
    if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID do personagem a ser deletado', '/delete Anitta')
    const char = await getCardFromArg(ctx.args.join(' '))
    if (!char) return ctx.responses.replyCouldNotFind('um personagem com esse nome ou ID')

    return ctx.es2.enter('DELETE_CARD_ES2', { card: char })
}

export const info = {
    guards: ['hasJoinedGroup'],
    aliases: ['delcard', 'del']
}
