import { BotContext } from '../types/context.js'
import { getCategoryByID } from '../utilities/engine/category.js'
import { reportWithContext } from '../reporting/index.js'

export default async (ctx: BotContext) => {
  const firstCategory = ctx.args[0]
  const name = ctx.args.slice(1).join(' ')
  if (!firstCategory || !name) {
    return ctx.reply('Você precisa especificar uma subcategoria para criar.\n\nUsa-se createsub id nome')
  }

  const cat = await getCategoryByID(parseInt(firstCategory))
  if (!cat) {
    const cats = await _brklyn.db.category.findMany()
    return ctx.replyWithHTML('Categoria não encontrada. As seguintes categorias estão disponíveis:\n\n' + cats.map(c => `${c.emoji} <code>${c.id}</code>. <b>${c.name}</b>`).join('\n'))
  }

  const sub = await _brklyn.db.subcategory.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      categoryId: cat.id
    }
  })
  if (sub) {
    return ctx.reply('Subcategoria já existe.')
  }

  const doc = await _brklyn.db.subcategory.create({
    data: {
      name,
      categoryId: cat.id
    }
  })

  await reportWithContext(ctx, 'CRIAÇÃO_DE_SUBCATEGORIA', { subcategoryID: doc.id, name, categoryEmoji: cat.emoji })

  return ctx.replyWithHTML(`Subcategoria criada com sucesso.\n\n${cat.emoji} <code>${doc.id}</code>. <b>${name}</b>\n\nPara adicionar uma capa à subcategoria, use <code>/setimageclc ${doc.id}</code>`)
}


export const info = {
  guards: ['isAdmin']
}
