import { BotContext } from '../types/context.js'
import { generatePhotoLink } from '../utilities/telegram.js'
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
  // @ts-ignore
  const photos = ctx.message?.photo || ctx.message?.reply_to_message?.photo
  const photo = photos?.[0] ? photos[photos.length - 1].file_id : null
  let imgString
  if (photo) {
    const link = await generatePhotoLink(photo)
    if (link) {
      const id = generateID(32)
      const aa = await _brklyn.images.uploadFileFromUrl(`${id}.jpg`, link).catch(async (e) => {
        await ctx.reply('Erro ao fazer upload da imagem.')
        return null
      })
      if (aa) imgString = `id:${id}`
    } else {
      return ctx.reply('Não foi possível obter o link da foto.')
    }
  }
  if (!imgString) {
    return ctx.reply('Você precisa enviar uma foto ou passar um link para a imagem.')
  }

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
