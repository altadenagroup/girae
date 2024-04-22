import { BotContext } from '../types/context.js'
import { getSubcategoryByID } from '../utilities/engine/subcategories.js'
import { reportWithContext } from '../reporting/index.js'

export default async (ctx: BotContext) => {
  const firstCategory = ctx.args[0]
  if (!firstCategory) {
    return ctx.reply('Você precisa especificar o ID da subcategoria para deletar.\n\nUsa-se delsubcategory subcategoria')
  }

  const sub1 = await getSubcategoryByID(parseInt(firstCategory))

  if (!sub1) {
    return ctx.reply('Subcategoria não encontrada.')
  }

  const cards = await _brklyn.db.card.count({
    where: {
      subcategoryId: sub1.id
    }
  })

  if (cards > 0) {
    return ctx.reply('Ainda existem cartas nesta subcategoria. Transfira-as antes de deletar a subcategoria.')
  }

  await _brklyn.db.subcategory.delete({
    where: {
      id: sub1.id
    }
  })

  await reportWithContext(ctx, 'REMOÇÃO_DE_SUBCATEGORIA', { subcategoryID: sub1.id, name: sub1.name, categoryEmoji: '❌' })

  return ctx.reply(`Subcategoria ${sub1.name} deletada.`)
}

export const info = {
  guards: ['isAdmin'],
  aliases: ['delsub']
}
