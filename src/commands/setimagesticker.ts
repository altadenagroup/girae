import { BotContext } from '../types/context.js'
import { uploadAttachedPhoto } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getStickerByID } from '../utilities/engine/vanity.js'

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) {
    return ctx.reply('Você precisa especificar o ID do sticker para editar a imagem.\n\nUsa-se setimagesticker id')
  }

  const cs = await getStickerByID(parseInt(ctx.args[0]))
  if (!cs || !cs[0]) {
    return ctx.reply('Papel de parede não encontrado.')
  }

  const c = cs[0]
  const imgString = await uploadAttachedPhoto(ctx, true, true)
  if (!imgString) return

  await _brklyn.db.profileSticker.update({
    where: {
      id: c.id
    },
    data: {
      image: imgString
    }
  })

  await _brklyn.db.shopItem.updateMany({
    where: {
      itemId: c.id,
      type: 'STICKER'
    },
    data: {
      image: imgString
    }
  })

  return ctx.replyWithPhoto(parseImageString(imgString, false), {
    caption: `Imagem do sticker ${c.name} atualizado.`,
    parse_mode: 'HTML'
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
