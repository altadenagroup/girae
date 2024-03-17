import { BotContext } from '../types/context.js'
import { setFavoriteColor } from '../utilities/engine/users.js'

const fonts = ['lato', 'lora', 'montserrat', 'open-sans', 'oswald', 'playfair-display', 'pt-sans', 'raleway', 'roboto', 'source-sans-pro']

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o código HEX da cor', '/cor #ff0000')
  const color = ctx.args[0]
  // color may or may not start with #
  if (!color.match(/^(#)?[0-9a-fA-F]{6}$/)) return ctx.responses.replyCouldNotFind('um código HEX válido')
  await setFavoriteColor(ctx.userData.id, color.startsWith('#') ? color : ('#' + color))
  const colorNoHash = color.startsWith('#') ? color.slice(1) : color
  const img = `https://placehold.co/600x400/${colorNoHash}/${getConstrastingColor(color)}.png?text=${colorNoHash}&font=${fonts[Math.floor(Math.random() * fonts.length)]}`
  return ctx.replyWithPhoto(img, {
    caption: `🌈 A cor <b>${color}</b> é agora a sua cor favorita!`,
    parse_mode: 'HTML'
  })
}

const getConstrastingColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return (yiq >= 128) ? 'black' : 'white'
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['cor', 'color', 'corfav', 'corfavorita']
}
