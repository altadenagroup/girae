import { BotContext } from '../types/context.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getCategoryFromArg } from '../utilities/parser.js'

export const prettyCategories = (cats) =>
  cats
    .filter(c => c.id !== 0)
    .sort((a, b) => a.id - b.id)
    .map(c => `${c.emoji} <code>${c.id}</code>. <b>${c.name}</b>`)
    .join('\n')

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID da categoria a ser vista', '/ctg Música')

  const cats = await getCategoryFromArg(ctx.args.join(' '))
  if (!cats || !cats[0]) return ctx.replyWithHTML('Categoria não encontrada. As seguintes categorias estão disponíveis:\n\n' + prettyCategories(await _brklyn.db.category.findMany()))

  const cat = cats[0]
  const subsCount = await _brklyn.db.subcategory.count({ where: { categoryId: cat.id, isSecondary: false } })

  const args = {
    totalPages: Math.ceil(subsCount / 20),
    totalSubs: subsCount,
    id: cat.id,
    name: cat.name,
    emoji: cat.emoji,
    imageURL: cat.image ? parseImageString(cat.image, false, true) : undefined
  }

  return ctx.es2.enter('SHOW_CTG', args)
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['cats', 'ctg']
}
