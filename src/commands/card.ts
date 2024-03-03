import { BotContext } from "../types/context.js"
import { parseImageString } from "../utilities/lucky-engine.js"
import { getCardFromArg } from "../utilities/parser.js"
import { determineMethodToSendMedia } from "../utilities/telegram.js"

const medalMap = {
    'Comum': '🥉',
    'Raro': '🥈',
    'Lendário': '🎖️'
}

export default async (ctx: BotContext) => {
    if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID do personagem a ser pesquisado', '/fav Katsuragi Misato')
    const char = await getCardFromArg(ctx.args.join(' '))
    if (!char) return ctx.responses.replyCouldNotFind('um personagem com esse nome ou ID')
    const img = parseImageString(char.image, 'ar_3:4,c_crop')

    const repeated = await _brklyn.engine.getUserTotalGivenCardAmount(ctx.userData, char)

    const tagExtra = char.tags?.[0]  ? `\n🔖 ${char.tags[0]}` : ''
    const text = `${medalMap[char.rarity?.name || 'Comum']} <code>${char.id}</code>. <b>${char.name}</b>
${char.category?.emoji || '?'} <i>${char.subcategory?.name || '?'}</i>${tagExtra}

👾 ${ctx.from?.first_name} tem ${repeated} card${repeated === 1 ? '' : 's'}`

    const method = determineMethodToSendMedia(img)
    return ctx[method!](img, {
        caption: text,
        parse_mode: 'HTML'
    })
}

export const info = {
    guards: ['hasJoinedGroup'],
    aliases: ['view', 'ver']
}
