import { BotContext } from '../types/context.js'
import { uploadAttachedPhoto } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getCategoryFromArg } from '../utilities/parser.js'

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) {
    return ctx.reply('Você precisa especificar o ID ou nome da subcategoria para editar a imagem.\n\nUsa-se setimageclc id')
  }

  const cs = await getCategoryFromArg(ctx.args.join(' '))
  if (!cs || !cs[0]) {
    return ctx.reply('Categoria não encontrada.')
  }

  const c = cs[0]
  const imgString = await uploadAttachedPhoto(ctx, true)
  if (!imgString) return

  await _brklyn.db.category.update({
    where: {
      id: c.id
    },
    data: {
      image: imgString
    }
  })

  return ctx.replyWithPhoto(parseImageString(imgString, false), {
    caption: `Imagem da categoria ${c.name} atualizada.`,
    parse_mode: 'HTML'
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin'],
  aliases: ['setimgcat']
}
