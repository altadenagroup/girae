import { BotContext } from '../types/context.js'
import { getCardsByTag } from '../utilities/engine/cards.js'

const medalMap = {
  'Comum': '🥉',
  'Raro': '🥈',
  'Lendário': '🎖️'
}

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome da tag a ser pesquisada', '/clc Aeons')
  let cards = await getCardsByTag(ctx.args.join(' '))
  if (!cards || !cards[0]) return ctx.responses.replyCouldNotFind('uma tag com esse nome')

  // sort cards by rarest and get top 20
  const sorted = cards.sort((a, b) => (a.rarity?.chance || 0) - (b.rarity?.chance || 0)).slice(0, 30)

  const text = sorted.map(cardOnList).join('\n')
  return ctx.replyWithHTML(`🔍 <b>${cards.length}</b> resultados encontrados:\n\n${text}\n\nPara ver um desses cards, use <code>/card id</code>`)
}

const cardOnList = (card) => `${medalMap[card.rarity?.name || 'Comum']} <code>${card.id}</code>. <b>${card.name}</b> ${card.category?.emoji || '?'} <i>${card.subcategory?.name || '?'}</i>`

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['tag', 'searchtag']
}
