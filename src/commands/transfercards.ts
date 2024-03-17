import { BotContext } from '../types/context.js'
import { getSubcategoryByID } from '../utilities/engine/subcategories.js'

export default async (ctx: BotContext) => {
  const firstCategory = ctx.args[0]
  const secondCategory = ctx.args[1]
  if (!firstCategory || !secondCategory) {
    return ctx.reply('Você precisa especificar duas subcategorias para transferir as cartas.\n\nUsa-se transfercards subcategoria1 subcategoria2')
  }

  const sub1 = await getSubcategoryByID(parseInt(firstCategory))
  const sub2 = await getSubcategoryByID(parseInt(secondCategory))

  if (!sub1 || !sub2) {
    return ctx.reply('Uma ou mais subcategorias não foram encontradas.')
  }

  // get all cards with sub 1 and updte to use sub 2
  const cards = await _brklyn.db.card.count({
    where: {
      subcategoryId: sub1.id
    }
  })

  if (cards === 0) {
    return ctx.reply('Não há cartas para transferir.')
  }

  const updated = await _brklyn.db.card.updateMany({
    where: {
      subcategoryId: sub1.id
    },
    data: {
      subcategoryId: sub2.id
    }
  })

  return ctx.reply(`Transferidas ${updated.count} cartas de ${sub1.name} para ${sub2.name}.`)
}


export const info = {
  guards: ['isAdmin']
}
