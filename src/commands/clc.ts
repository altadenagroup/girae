import { BotContext } from "../types/context.js"
import { getCardsBySubcategory } from "../utilities/engine/cards.js"
import { checkIfUserHasCards } from "../utilities/engine/users.js"
import { parseImageString } from "../utilities/lucky-engine.js"
import { getSubcategoryFromArg } from "../utilities/parser.js"
import { determineMethodToSendMedia } from "../utilities/telegram.js"

const medalMap = {
    'Comum': '🥉',
    'Raro': '🥈',
    'Lendário': '🎖️'
}

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID da subcategoria a ser vista', '/clc Red Velvet')
  let subs = await getSubcategoryFromArg(ctx.args.join(' '))
  if (!subs || !subs?.[0]) return ctx.responses.replyCouldNotFind('uma subcategoria com esse nome/ID')
  if (subs.length > 1) {
    const text = subs.map(sub => `${sub.category?.emoji} <code>${sub.id}</code>. <b>${sub.name}</b>`).join('\n')
    return ctx.replyWithHTML(`🔍 <b>${subs.length}</b> resultados encontrados:\n\n${text}\n\nPara ver uma dessas subcategorias, use <code>/clc id</code>`)
  }

  const sub = subs[0]
  const cards = await getCardsBySubcategory(sub)
  if (!cards?.[0]) return ctx.responses.replyCouldNotFind('nenhum card nessa subcategoria')
  // sort cards by rarest and get top 20
  const sorted = cards.sort((a, b) => (a.rarity?.chance || 0) - (b.rarity?.chance || 0)).slice(0, 20)

  const userCards = await checkIfUserHasCards(ctx.userData.id, sorted.map(c => c.id))
  const uniqueCardsOwned = userCards.filter((card, index, self) => self.findIndex(c => c.cardId === card.cardId) === index)

  const text = sorted.map(cardOnList(userCards)).join('\n')
  const msg = `${cards[0].category?.emoji} <code>${sub.id}</code>. <b>${sub.name}</b>
🎲 <code>${cards.length}</code> cards no total, <code>${uniqueCardsOwned.length}</code> na sua coleção.

${text}

Para ver um desses cards, use <code>/card id</code>`

  if (sub.image) {
    const imgURL = parseImageString(sub.image, false)!
    const method = determineMethodToSendMedia(imgURL)
    return ctx[method](imgURL, { parse_mode: 'HTML', caption: msg })
  }

  return ctx.replyWithHTML(msg)
}

const cardOnList = (userCards) => {
  return (card) => {
    const userOwnsCard = userCards.filter(uc => uc.cardId === card.id).length
    return `${medalMap[card.rarity?.name || 'Comum']} <code>${card.id}</code>. <b>${card.name}</b> ${userOwnsCard > 0 ? `<code>${userOwnsCard}x</code>` : card.category?.emoji}`
  }
}

export const info = {
    guards: ['hasJoinedGroup'],
    aliases: ['sub']
}
