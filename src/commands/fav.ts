import { BotContext } from '../types/context.js'
import { setFavoriteCard } from '../utilities/engine/users.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getCardFromArg } from '../utilities/parser.js'
import { determineMethodToSendMedia } from '../utilities/telegram.js'

const fonts = ['lato', 'lora', 'montserrat', 'open-sans', 'oswald', 'playfair-display', 'pt-sans', 'raleway', 'roboto', 'source-sans-pro']
const getConstrastingColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return (yiq >= 128) ? 'black' : 'white'
}

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID do personagem a ser favoritado', '/fav Katsuragi Misato')
  if (['color', 'emoji', 'cor'].some(x => ctx.args[0].startsWith(x))) {
    if (ctx.args[0].startsWith('cor') || ctx.args[0].startsWith('color')) {
      const color = ctx.args[1]
      if (!color) return ctx.responses.replyMissingArgument('o código hexadecimal da cor', '/fav cor #ff0000')
      if (!/^#[0-9a-f]{6}$/i.test(color)) return ctx.replyWithHTML('Código hexadecimal inválido. 😔\nExemplo: <code>#ff0000</code>')
      await _brklyn.db.userProfile.update({ where: { userId: ctx.userData.id }, data: { favoriteCardColor: color } })
      const colorNoHash = color.slice(1)
      const img = `https://placehold.co/600x400/${colorNoHash}/${getConstrastingColor(color)}.png?text=${colorNoHash}&font=${fonts[Math.floor(Math.random() * fonts.length)]}`
      return ctx.replyWithPhoto(img, {
        caption: `🌈 A cor <b>${color}</b> é agora a sua cor favorita!`,
        parse_mode: 'HTML'
      })
    }

    if (ctx.args[0].startsWith('emoji')) {
      const emoji = ctx.args[1]
      // on or off
      if (!emoji) return ctx.responses.replyMissingArgument('on ou off', '/fav emoji on')
      if (!['on', 'off'].includes(emoji)) return ctx.replyWithHTML('Escolha entre <code>on</code> e <code>off</code>.')
      await _brklyn.db.userProfile.update({ where: { userId: ctx.userData.id }, data: { hideCardEmojis: emoji === 'off' } })
      return ctx.reply(`Os emojis de cards estão agora ${emoji === 'off' ? 'desativados' : 'ativados'}.`)
    }
  }

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
