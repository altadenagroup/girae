import { BotContext } from '../types/context.js'
import { generatePhotoLink, uploadAttachedPhoto } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getSubcategoryFromArg } from '../utilities/parser.js'
import { generateID } from '../utilities/misc.js'

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) {
    return ctx.reply('Você precisa especificar o ID ou nome da subcategoria para editar a imagem.\n\nUsa-se setimageclc id')
  }

  const cs = await getSubcategoryFromArg(ctx.args.join(' '))
  if (!cs || !cs[0]) {
    return ctx.reply('Subcategoria não encontrada.')
  }

  const c = cs[0]
  const imgString = await uploadAttachedPhoto(ctx)
  if (!imgString) return

  await _brklyn.db.subcategory.update({
    where: {
      id: c.id
    },
    data: {
      image: imgString
    }
  })

  return ctx.replyWithPhoto(parseImageString(imgString, false), {
    caption: `Imagem da subcategoria ${c.name} atualizada.`,
    parse_mode: 'HTML'
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
