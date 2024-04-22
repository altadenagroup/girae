import { BotContext } from '../types/context.js'
import { getStickerByID } from '../utilities/engine/vanity.js'
import { reportWithContext } from '../reporting/index.js'

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do sticker para deletar.\n\nUsa-se delsticker bg')
  }

  const c = await getStickerByID(parseInt(card))
  if (!c) {
    return ctx.reply('Sticker não encontrado.')
  }

  await _brklyn.db.userProfile.updateMany({
    where: {
      stickerId: c.id
    },
    data: {
      stickerId: null
    }
  })

  await _brklyn.db.profileSticker.delete({
    where: {
      id: c.id
    }
  })

  await _brklyn.db.shopItem.deleteMany({
    where: {
      itemId: c.id,
      type: 'STICKER'
    }
  })

  await reportWithContext(ctx, 'REMOÇÃO_DE_STICKER', { stickerID: c.id, name: c.name })

  return ctx.reply(`Sticker ${c.name} deletado.`)
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
