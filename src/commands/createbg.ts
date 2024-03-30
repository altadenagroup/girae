import { BotContext } from '../types/context.js'
import { uploadAttachedPhoto } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'

export default async (ctx: BotContext) => {
  const data = ctx.args.join(' ')
  if (!data || ctx.args.length < 3) {
    return ctx.reply('Você precisa especificar os dados do papel de parede a ser criado. Usa-se /createbg <preço> Nome do papel de parede - Descrição do papel de parede.')
  }

  const args = ctx.args
  const price = parseInt(args[0])
  if (isNaN(price)) return ctx.reply('O preço precisa ser um número inteiro. Usa-se /createbg <preço> Nome do papel de parede - Descrição do papel de parede.')
  const rest = args.slice(1).join(' ')
  const [name, ...descriptionParts] = rest.split(' - ')
  if (name.length > 100) return ctx.reply('O nome do papel de parede não pode ter mais de 40 caracteres.')
  const description = descriptionParts.join(' ')

  const imgString = await uploadAttachedPhoto(ctx)
  if (!imgString) return

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
    caption: `🖼 <code>${bg.id}</code>. <b>${name}</b>\n<i>${description}</i>\n\n💰 ${price} moedas`,
    parse_mode: 'HTML'
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
