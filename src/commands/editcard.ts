import { BotContext } from '../types/context.js'
import { getCardByID } from '../utilities/engine/cards.js'

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do card para editar.\n\nUsa-se editcard card')
  }

  const c = await getCardByID(parseInt(card))
  if (!c) {
    return ctx.reply('Card não encontrado.')
  }

  return ctx.scene.enter('ADD_CARD_SCENE', { editCard: c })
}


export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
