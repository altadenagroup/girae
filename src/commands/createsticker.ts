import { BotContext } from '../types/context.js'
import { getAttachedPhotoURL } from '../utilities/telegram.js'

export default async (ctx: BotContext) => {
  const data = ctx.args.join(' ')
  if (!data || ctx.args.length < 3) {
    return ctx.reply('Você precisa especificar os dados do sticker a ser criado. Usa-se /createsticker <preço> Nome do sticker - Descrição do sticker.')
  }

  const args = ctx.args
  const price = parseInt(args[0])
  if (isNaN(price)) return ctx.reply('O preço precisa ser um número inteiro. Usa-se /createsticker <preço> Nome - Descrição.')
  const rest = args.slice(1).join(' ')
  const [name, ...descriptionParts] = rest.split(' - ')
  if (name.length > 100) return ctx.reply('O nome do sticker não pode ter mais de 40 caracteres.')
  const description = descriptionParts.join(' ')

  // check if there's a bg with name
  const exists = await _brklyn.db.profileSticker.findFirst({
    where: {
      name
    }
  })
  if (exists) return ctx.reply('Já existe um papel de parede com esse nome.')

  const url = await getAttachedPhotoURL(ctx)
  if (!url) return ctx.reply('Você precisa enviar uma foto como para criar o papel de parede.')

  return ctx.es2.enter('ADD_ITEM', {
    name,
    price,
    type: 'STICKER',
    description,
    file: url
  })
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
