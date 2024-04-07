import { BotContext } from '../types/context.js'
import { getCountCardsOnSubcategoryOwnedByUser, getCardsOnSubcategoryOwnedByUser, getCountOfCardsBySubcategory, getCardsByTag } from '../utilities/engine/cards.js'
import { migrateCardsToSubcategory } from '../utilities/engine/subcategories.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getSubcategoryFromArg } from '../utilities/parser.js'

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID da subcategoria a ser vista', '/clc Red Velvet')
  // @ts-ignore
  let subs = await getSubcategoryFromArg(ctx.args.join(' '), ctx.message.text.startsWith('/tag'))
  // @ts-ignore
  if (!subs[0] && ctx.message.text.startsWith('/tag')) {
    // check if there are any cards with the tag
    const cards = await getCardsByTag(ctx.args.join(' '))
    if (!cards || !cards?.[0]) return ctx.responses.replyCouldNotFind('nenhum card com essa tag')
    subs = [await migrateCardsToSubcategory(ctx.args.join(' '))]
  }

  subs = subs.filter(a => a)
  // @ts-ignore
  if (ctx.message.text.startsWith('/tag')) {
    // remove everything that isn't a secondary subcategory
    subs = subs.filter(sub => sub.isSecondary)
  // @ts-ignore
  } else if (ctx.message.text.startsWith('/clc')) {
    // remove everything that isn't a primary subcategory
    subs = subs.filter(sub => !sub.isSecondary)
  }
  if (!subs || !subs?.[0]) return ctx.responses.replyCouldNotFind('uma subcategoria com esse nome/ID')

  if (subs.length > 1) {
    // @ts-ignore
    if (ctx.message.text.startsWith('/tag')) {
      const text = subs
        .map(sub => `${sub.category?.emoji} <code>${sub.id}</code>. <b>${sub.name}</b>`).join('\n')
      return ctx.replyWithHTML(`🔍 <b>${subs.length}</b> resultados encontrados:\n\n${text}\n\nPara ver uma dessas tags, use <code>/tag id</code>`)
    }

    const text = subs
      .filter(sub => !sub.isSecondary)
      .map(sub => `${sub.category?.emoji} <code>${sub.id}</code>. <b>${sub.name}</b>`).join('\n')
    return ctx.replyWithHTML(`🔍 <b>${subs.length}</b> resultados encontrados:\n\n${text}\n\nPara ver uma dessas subcategorias, use <code>/clc id</code>`)
  }

  const sub = subs[0]
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
    imageURL: sub.image ? parseImageString(sub.image, false) : undefined,
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
