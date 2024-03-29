import { BotContext } from '../types/context.js'
import { getCardByID } from '../utilities/engine/cards.js'
import { generatePhotoLink, uploadAttachedPhoto } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { generateID } from '../utilities/misc.js'

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do card para editar a imagem.\n\nUsa-se setimage id')
  }

  const c = await getCardByID(parseInt(card))
  if (!c) {
    return ctx.reply('Card não encontrado.')
  }

  const imgString = await uploadAttachedPhoto(ctx)
  if (!imgString) return

  await _brklyn.db.card.update({
    where: {
      id: c.id
    },
    data: {
      image: imgString
    }
  })

  return ctx.replyWithPhoto(parseImageString(imgString, 'ar_3:4,c_crop'), {
    caption: `Imagem do card ${c.name} atualizada.`,
    parse_mode: 'HTML'
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
