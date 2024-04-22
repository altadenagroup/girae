import { BotContext } from '../types/context.js'
import { getSubcategoryByID } from '../utilities/engine/subcategories.js'
import { reportWithContext } from '../reporting/index.js'

export default async (ctx: BotContext) => {
  const firstCategory = ctx.args[0]
  const alias = ctx.args[1]?.toLowerCase?.()

  if (!firstCategory || !alias) {
    return ctx.reply('Você precisa especificar o ID da subcategoria e o apelido a ser definido.\n\nUsa-se setapelido subcategoria apelido')
  }

  const sub1 = await getSubcategoryByID(parseInt(firstCategory))

  if (!sub1) {
    return ctx.reply('A subcategoria não foi encontrada.')
  }

  await _brklyn.db.subcategory.update({
    where: {
      id: sub1.id
    },
    data: {
      aliases: {
        push: alias
      }
    }
  })

  await reportWithContext(ctx, 'ADIÇÃO_DE_APELIDO_DE_SUBCATEGORIA', { subcategoryID: sub1.id, name: sub1.name, categoryEmoji: '❌' }, { newValue: alias, field: 'apelido', oldValue: '...' })

  return ctx.reply(`Apelido ${alias} definido para a subcategoria ${sub1.name}.`)
}


export const info = {
  guards: ['isAdmin']
}
