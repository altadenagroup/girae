import { BotContext } from "../types/context.js"
import { setFavoriteCard } from "../utilities/engine/users.js"
import { parseImageString } from "../utilities/lucky-engine.js"
import { getCardFromArg } from "../utilities/parser.js"
import { determineMethodToSendMedia } from "../utilities/telegram.js"

export default async (ctx: BotContext) => {
    if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID do personagem a ser favoritado', '/fav Katsuragi Misato')
    const char = await getCardFromArg(ctx.args.join(' '))
    if (!char) return ctx.responses.replyCouldNotFind('um personagem com esse nome ou ID')
    const rst = await setFavoriteCard(ctx.userData.id, char.id)
    if (!rst) return ctx.reply('Oops... parece que você ainda não tem esse personagem. 😅\nEncontre-o usando /girar ou fazendo trocas para favoritá-lo.')
    const img = parseImageString(char.image, 'ar_3:4,c_crop')
    const method = determineMethodToSendMedia(img)
    return ctx[method!](img, {
        caption: `🌟 <b>${char.name}</b> é agora o seu personagem favorito!`,
        parse_mode: 'HTML'
    })
}

export const info = {
    guards: ['hasJoinedGroup'],
    aliases: ['favorito', 'favorite']
}