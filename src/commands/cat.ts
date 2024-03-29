import { BotContext } from "../types/context.js"
import { getCountOfCardsOnCategory } from "../utilities/engine/category.js"
import { getSubcategoriesByCategoryID } from "../utilities/engine/subcategories.js"
import { getHowManyCardsUserHasFromCategory } from "../utilities/engine/users.js"
import { readableNumber } from "../utilities/misc.js"
import { getCategoryFromArg } from "../utilities/parser.js"

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID da categoria a ser vista', '/clc Red Velvet')
  let cats = await getCategoryFromArg(ctx.args.join(' '))
  if (!cats || !cats?.[0]) return ctx.responses.replyCouldNotFind('uma categoria com esse nome/ID')
  if (cats.length > 1) {
    const text = cats.map(sub => `${sub.emoji} <code>${sub.id}</code>. <b>${sub.name}</b>`).join('\n')
    return ctx.replyWithHTML(`🔍 <b>${cats.length}</b> resultados encontrados:\n\n${text}\n\nPara ver uma dessas categorias, use <code>/cat id</code>`)
  }

  const category = cats[0]
  const total = await getCountOfCardsOnCategory(category.id)
  const user = await getHowManyCardsUserHasFromCategory(ctx.userData.id, category.id)

  const subs = await getSubcategoriesByCategoryID(category.id)

  return ctx.replyWithHTML(`📦 <code>${category.id}</code> <b>${category.name}</b>

${subs.map(sub => `${category.emoji} <code>${sub.id}</code>. <b>${sub.name}</b>`).join('\n')}

👨‍👨‍👧‍👧 <b>${readableNumber(total)}</b> cards no total
👤 <b>${readableNumber(user)}</b> cards na sua coleção`)
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['cats']
}
