import { BotContext } from '../types/context.js'
import { uploadAttachedPhoto } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getBackgroundByID } from '../utilities/engine/vanity.js'

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) {
    return ctx.reply('Você precisa especificar o ID do papel de parede para editar a imagem.\n\nUsa-se setimagebg id')
  }

  const c = await getBackgroundByID(parseInt(ctx.args[0]))
  if (!c) {
    return ctx.reply('Papel de parede não encontrado.')
  }

  const imgString = await uploadAttachedPhoto(ctx, true)
  if (!imgString) return

  await _brklyn.db.profileBackground.update({
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
      type: 'BACKGROUND'
    },
    data: {
      image: imgString
    }
  })

  return ctx.replyWithPhoto(parseImageString(imgString, false), {
    caption: `Imagem do papel de parede ${c.name} atualizado.`,
    parse_mode: 'HTML'
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin'],
  aliases: ['setimgbg']
}
