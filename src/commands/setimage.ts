import { BotContext } from '../types/context.js'
import { getCardByID } from '../utilities/engine/cards.js'
import { uploadAttachedPhoto } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { reportWithContext } from '../reporting/index.js'

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do card para editar a imagem.\n\nUsa-se setimage id')
  }

  const c = await getCardByID(parseInt(card))
  if (!c) {
    return ctx.reply('Card não encontrado.')
  }

  const imgString = await uploadAttachedPhoto(ctx, true)
  if (!imgString) return

  await _brklyn.db.card.update({
    where: {
      id: c.id
    },
    data: {
      image: imgString
    }
  })

  await reportWithContext(ctx, 'EDIÇÃO_DE_IMAGEM_DE_CARD', { cardID: c.id, name: c.name, rarityName: 'desconhecida', categoryEmoji: '🔄' })
  return ctx.replyWithPhoto(parseImageString(imgString, 'ar_3:4,c_crop'), {
    caption: `Imagem do card ${c.name} atualizada.`,
    parse_mode: 'HTML'
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin'],
  aliases: ['setimg']
}
