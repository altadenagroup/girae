import { BotContext } from '../types/context.js'
import { findStoreItem } from '../utilities/engine/store.js'
import { getBackgroundByID } from '../utilities/engine/vanity.js'

export default async (ctx: BotContext) => {
  const card = ctx.args[0]
  if (!card) {
    return ctx.reply('Você precisa especificar o ID do papel de parede para editar.\n\nUsa-se editbg id')
  }

  const c = await getBackgroundByID(parseInt(card))
  if (!c) {
    return ctx.reply('Papel de parede não encontrado.')
  }

  const shopEntry = await findStoreItem('BACKGROUND', c.id)

  const data = {
    name: c.name,
    price: shopEntry?.price || 0,
    type: 'BACKGROUND',
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
