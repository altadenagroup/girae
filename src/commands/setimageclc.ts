import { BotContext } from '../types/context.js'
import { uploadAttachedPhoto } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getSubcategoryFromArg } from '../utilities/parser.js'
import { reportWithContext } from '../reporting/index.js'
import { getSubcategoryByID } from '../utilities/engine/subcategories.js'
import { notifySubcategoryImageChange } from '../sidecar/functions/changelog.js'
import { error } from 'melchior'

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) {
    return ctx.reply('Você precisa especificar o ID ou nome da subcategoria para editar a imagem.\n\nUsa-se setimageclc id')
  }

  const cs = await getSubcategoryFromArg(ctx.args.join(' '))
  if (!cs || !cs[0]) {
    return ctx.reply('Subcategoria não encontrada.')
  }

  const c = cs[0]
  const imgString = await uploadAttachedPhoto(ctx, true)
  if (!imgString) return

  await _brklyn.db.subcategory.update({
    where: {
      id: c.id
    },
    data: {
      image: imgString
    }
  })

  const fullSub = await getSubcategoryByID(c.id)

  if (!c.image) await notifySubcategoryImageChange(fullSub as any).catch((e) => {
    error('setimageclc', 'error while notifying subcategory image change: '+ e.stack)
  })

  await reportWithContext(ctx, 'EDIÇÃO_DE_IMAGEM_DE_SUBCATEGORIA', { subcategoryID: c.id, name: c.name, categoryEmoji: '🔄' })

  return ctx.replyWithPhoto(parseImageString(imgString, false), {
    caption: `Imagem da subcategoria ${c.name} atualizada.`,
    parse_mode: 'HTML'
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin'],
  aliases: ['setimgclc']
}
