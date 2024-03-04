import { BotContext } from "../types/context.js"
import { getCardByID } from "../utilities/engine/cards.js"

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do card para deletar.\n\nUsa-se delcard card')
  }

  const c = await getCardByID(parseInt(card))
  if (!c) {
    return ctx.reply('Card não encontrado.')
  }

  await _brklyn.db.card.delete({
    where: {
      id: c.id
    }
  })

  return ctx.reply(`Card ${c.name} deletado.`)
}

export const info = {
  guards: ['hasJoinedGroup']
}
