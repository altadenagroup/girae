import { BotContext } from '../types/context.js'
import { getCardByID } from '../utilities/engine/cards.js'
import { generatePhotoLink } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { generateID } from '../utilities/misc.js'

export default async (ctx: BotContext) => {
  const data = ctx.args[0]
  if (!data || data.split(' ').length < 3) {
    return ctx.reply('Você precisa especificar os dados do papel de parede a ser criado. Usa-se /createbg <preço> Nome do papel de parede - Descrição do papel de parede.')
  }

  const args = data.split(' ')
  const price = parseInt(args[0])
  if (isNaN(price)) return ctx.reply('O preço precisa ser um número inteiro. Usa-se /createbg <preço> Nome do papel de parede - Descrição do papel de parede.')
  const [name, ...descriptionParts] = args.slice(1)
  if (name.length > 40) return ctx.reply('O nome do papel de parede não pode ter mais de 40 caracteres.')
  const description = descriptionParts.join(' ')

  // @ts-ignore
  const photos = ctx.message?.photo || ctx.message?.reply_to_message?.photo
  const photo = photos?.[0] ? photos[photos.length - 1].file_id : null
  let imgString = ctx.args[1] ? `url:${ctx.args[1]}` : null
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

  // first, create the bg
  const bg = await _brklyn.db.profileBackground.create({
    data: {
      name,
      image: imgString
    }
  })

  // now, create the store listing
  await _brklyn.db.shopItem.create({
    data: {
      price,
      type: 'BACKGROUND',
      image: imgString,
      description,
      name,
      itemId: bg.id
    }
  })

  return ctx.replyWithPhoto(parseImageString(imgString, false, undefined), {
    caption: `🖼 <code>${bg.id}</code> <b>${name}</b>\n<i>${description}</i>\n\n💰 ${price} moedas`,
    parse_mode: 'HTML'
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
