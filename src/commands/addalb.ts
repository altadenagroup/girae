import { DISCOTECA_ID } from '../constants.js'
import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  // Nome, Sub Categoria, Escutaê, Classificaçao, nome do artista
  // Don't Forget About Us, #1 Singles, Escutaê, Raro, Mariah Carey
  // check if argument count matches
  const args = ctx.args.join(' ').split(',').map((arg) => arg.trim())
  if (args.length !== 5) return ctx.responses.replyMissingArgument('o nome, subcategoria, escutaê, classificação e nome do artista da nova carta', '/addalb Don\'t Forget About Us, #1 Singles, Escutaê, Raro, Mariah Carey')
  const [name, subcategory, _, rarity, artist] = args
  return ctx.scene.enter('ADD_CARD_SCENE', { name, subcategory, category: DISCOTECA_ID, rarity, tags: [artist], noResize: true })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
