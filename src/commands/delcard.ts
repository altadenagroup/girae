import { BotContext } from '../types/context.js'
import { getCardByID } from '../utilities/engine/cards.js'
import { reportWithContext } from '../reporting/index.js'
import { Card } from '@prisma/client'

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do card para deletar.\n\nUsa-se delcard card')
  }

  const c = await getCardByID(parseInt(card))
  if (!c) {
    return ctx.reply('Card não encontrado.')
  }

  const cardD = await getCardByID(parseInt(card)) as Card
  await _brklyn.db.card.delete({
    where: {
      id: c.id
    }
  })
    .then(() => reportWithContext(ctx, 'REMOÇÃO_DE_CARD', { cardID: cardD.id, name: cardD.name, rarityName: 'desconhecida', categoryEmoji: '❌'}))
    .catch(err => ctx.reply(`Erro ao deletar card: ${err}`))

  return ctx.reply(`Card ${c.name} deletado.`)
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
