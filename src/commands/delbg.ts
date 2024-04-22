import { BotContext } from '../types/context.js'
import { getBackgroundByID } from '../utilities/engine/vanity.js'
import { reportWithContext } from '../reporting/index.js'

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do papel de parede para deletar.\n\nUsa-se delbg bg')
  }

  const c = await getBackgroundByID(parseInt(card))
  if (!c) {
    return ctx.reply('Papel de parede não encontrado.')
  }

  // disconnetct all user profiles using this bg
  await _brklyn.db.userProfile.updateMany({
    where: {
      backgroundId: c.id
    },
    data: {
      backgroundId: 1
    }
  })

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

  await reportWithContext(ctx, 'REMOÇÃO_DE_PAPEL_DE_PAREDE', { backgroundImageID: c.id, name: c.name })

  return ctx.reply(`Papel de parede ${c.name} deletado.`)
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
