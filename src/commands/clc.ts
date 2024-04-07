import { BotContext } from '../types/context.js'
import { getCountCardsOnSubcategoryOwnedByUser, getCardsOnSubcategoryOwnedByUser, getCountOfCardsBySubcategory } from '../utilities/engine/cards.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getSubcategoryFromArg } from '../utilities/parser.js'

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID da subcategoria a ser vista', '/clc Red Velvet')
  let subs = await getSubcategoryFromArg(ctx.args.join(' '))
  if (!subs || !subs?.[0]) return ctx.responses.replyCouldNotFind('uma subcategoria com esse nome/ID')
  if (subs.length > 1) {
    const text = subs.map(sub => `${sub.category?.emoji} <code>${sub.id}</code>. <b>${sub.name}</b>`).join('\n')
    return ctx.replyWithHTML(`🔍 <b>${subs.length}</b> resultados encontrados:\n\n${text}\n\nPara ver uma dessas subcategorias, use <code>/clc id</code>`)
  }

  const sub = subs[0]
  const cardCount = await getCountOfCardsBySubcategory(sub)
  if (cardCount === 0) return ctx.responses.replyCouldNotFind('nenhum card nessa subcategoria')
  // sort cards by rarest and get top 20
  const uc = await getCardsOnSubcategoryOwnedByUser(sub, ctx.userData).then((g) => g.map((r) => r.card.id))

  const args = {
    totalPages: Math.ceil(cardCount / 20),
    totalCards: cardCount,
    userOwnedCards: await getCountCardsOnSubcategoryOwnedByUser(sub, ctx.userData),
    id: sub.id,
    name: sub.name,
    emoji: sub.category?.emoji,
    userOwned: uc,
    imageURL: sub.image ? parseImageString(sub.image, false) : undefined,
    // @ts-ignore
    onlySecondary: ctx.message!.text!.startsWith('/tag'),
    userID: ctx.userData.id
  }

  return ctx.es2.enter('SHOW_CLC', args)
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['sub', 'colec', 'collec', 'col', 'tag']
}
