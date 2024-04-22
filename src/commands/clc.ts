import { BotContext } from '../types/context.js'
import {
  getCardsByTag,
  getCardsOnSubcategoryOwnedByUser,
  getCountCardsOnSubcategoryOwnedByUser,
  getCountOfCardsBySubcategory
} from '../utilities/engine/cards.js'
import { migrateCardsToSubcategory } from '../utilities/engine/subcategories.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getSubcategoryFromArg } from '../utilities/parser.js'

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID da subcategoria a ser vista', '/clc Red Velvet')
  let sub
  // @ts-ignore
  if (ctx.message.text.startsWith('/tag')) {
    let subs = await getSubcategoryFromArg(ctx.args.join(' '), true)
    if (!subs[0]) {
      const cards = await getCardsByTag(ctx.args.join(' '))
      if (cards?.[0]) {
        subs = [await migrateCardsToSubcategory(ctx.args.join(' '))]
        subs = subs.filter(a => a)
      } else {
        return ctx.responses.replyCouldNotFind('uma tag com esse nome/ID')
      }
    }

    if (subs.length > 1) {
      const text = subs
        .filter(sub => sub.isSecondary)
        .map(sub => `${sub.category?.emoji} <code>${sub.id}</code>. <b>${sub.name}</b>`).join('\n')
      return ctx.replyWithHTML(`🔍 <b>${subs.filter(sub => sub.isSecondary).length}</b> resultados encontrados:\n\n${text}\n\nPara ver uma dessas tags, use <code>/tag id</code>`)
    }
    sub = subs[0]
  } else {
    let subs = await getSubcategoryFromArg(ctx.args.join(' '), false)
    if (!subs || !subs?.[0]) return ctx.responses.replyCouldNotFind('uma subcategoria com esse nome/ID')
    if (subs.length > 1) {
      subs = subs.filter(sub => !sub.isSecondary)
      if (subs.length === 0) return ctx.responses.replyCouldNotFind('uma subcategoria com esse nome/ID')
      const text = subs
        .map(sub => `${sub.category?.emoji} <code>${sub.id}</code>. <b>${sub.name}</b>`).join('\n')
      return ctx.replyWithHTML(`🔍 <b>${subs.length}</b> resultados encontrados:\n\n${text}\n\nPara ver uma dessas subcategorias, use <code>/clc id</code>`)
    }
    sub = subs[0]
  }

  const cardCount = await getCountOfCardsBySubcategory(sub)
  if (cardCount === 0) return ctx.responses.replyCouldNotFind('nenhum card nessa subcategoria/tag')
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
    imageURL: sub.image ? parseImageString(sub.image, false, true) : undefined,
    // @ts-ignore
    onlySecondary: sub.isSecondary,
    userID: ctx.userData.id
  }

  return ctx.es2.enter('SHOW_CLC', args)
  // add add card id 6 to secondary subcategory 78

}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['sub', 'colec', 'collec', 'col', 'tag']
}
