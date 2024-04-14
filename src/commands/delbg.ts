import { BotContext } from '../types/context.js'
import { getBackgroundByID } from '../utilities/engine/vanity.js'

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do papel de parede para deletar.\n\nUsa-se delbg bg')
  }

  const c = await getBackgroundByID(parseInt(card))
  if (!c) {
    return ctx.reply('Papel de parede não encontrado.')
  }

  await _brklyn.db.profileBackground.delete({
    where: {
      id: c.id
    }
  })

  await _brklyn.db.shopItem.deleteMany({
    where: {
      itemId: c.id,
      type: 'BACKGROUND'
    }
  })

  return ctx.reply(`Papel de parede ${c.name} deletado.`)
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
