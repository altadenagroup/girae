import { BotContext } from '../types/context.js'
import { findStoreItem } from '../utilities/engine/store.js'
import { getStickerByID } from '../utilities/engine/vanity.js'

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do sticker para editar.\n\nUsa-se editsticker id')
  }

  const c = await getStickerByID(parseInt(card))
  if (!c) {
    return ctx.reply('Sticker não encontrado.')
  }

  const shopEntry = await findStoreItem('STICKER', c.id)

  const data = {
    name: c.name,
    price: shopEntry?.price || 0,
    type: 'STICKER',
    description: shopEntry?.description || 'Sem descrição.',
    file: c.image,
    id: c.id,
    shopItemID: shopEntry?.id,
    editing: true
  }

  return ctx.es2.enter('ADD_ITEM', data)
}


export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
