import { Rarity, Subcategory } from "@prisma/client"
import { MEDAL_MAP } from "../../constants.js"
import { parseImageString } from "../../utilities/lucky-engine.js"

export const getSubcategoriesCreatedInLastNHours = async (hours: number) => {
  const subcategories = await _brklyn.db.subcategory.findMany({
    where: { createdAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) } },
    include: {
      category: true,
      cards: { include: { rarity: true } },
      secondaryCards: { include: { rarity: true } }
    }
  })

  return subcategories
}

// only includes cards that were created in the last n hours but the subcategory was created before that
export const getNewCardsInOldSubcategories = async (hours: number) => {
  const subcategories = await _brklyn.db.subcategory.findMany({
    where: { createdAt: { lt: new Date(Date.now() - hours * 60 * 60 * 1000) }, isSecondary: false, cards: { some: { createdAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) } } } },
    include: { category: true, cards: { include: { rarity: true }, where: { createdAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) } } } }
  })

  return subcategories
}

export const notifySubcategoryModification = async (subcategory: Subcategory & { category: { emoji: string }, cards: { createdAt: any, id: number, rarity: Rarity, name: string }[] }) => {
  if (!subcategory.image) return

  const sortedCards = subcategory.cards
    .sort((a, b) => a.rarity.chance - b.rarity.chance)
    .map((c) => MEDAL_MAP[c.rarity.name] + ` <code>${c.id}</code>. <b>${c.name}</b> ${subcategory.category?.emoji}`)
    .join('\n')

  const cardsInSubcategory = await _brklyn.db.card.count({ where: { subcategoryId: subcategory.id } })
  const ddmmyyyy = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(subcategory.cards[0].createdAt)

  const text = `➕ <b>Adição de cartas novas</b>
📅 <b>${ddmmyyyy}</b>

${subcategory.category.emoji} <code>${subcategory.id}</code>. <b>${subcategory.name}</b>
🎲 <code>${cardsInSubcategory}</code> cards no total e <code>${subcategory.cards.length}</code> adicionado${subcategory.cards.length == 1 ? '' : 's'}.

${sortedCards}`
  const image = parseImageString(subcategory.image, false, true)

  await _brklyn.telegram.sendPhoto(process.env.ADDITION_CHANNEL_ID!, image, { caption: text, parse_mode: 'HTML' })
}

export const notifySubcategoryCreation = async (subcategory: Subcategory & { category: { emoji: string }, cards: { id: number, rarity: Rarity, name: string }[] }) => {
  if (!subcategory.image) return
  // @ts-ignore
  if (subcategory.isSecondary) subcategory.cards = subcategory.secondaryCards

  const sortedCards = subcategory.cards
    .sort((a, b) => a.rarity.chance - b.rarity.chance)
    .map((c) => MEDAL_MAP[c.rarity.name] + ` <code>${c.id}</code>. <b>${c.name}</b> ${subcategory.category?.emoji}`)
    .join('\n')

  const ddmmyyyy = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(subcategory.createdAt)

  const text = `➕ <b>Adição de coleção nova</b>
📅 <b>${ddmmyyyy}</b>

${subcategory.category.emoji} <code>${subcategory.id}</code>. <b>${subcategory.name}</b> ${subcategory.isSecondary ? '(tag)' : ''}
🎲 <code>${subcategory.cards.length}</code> cards adicionados no total.

${sortedCards}`

  // if the text has more than 3.5k characters, break it into two messages
  if (text.length > 3500) {
    const firstPart = text.slice(0, 3500)
    const secondPart = text.slice(3500)

    const image = parseImageString(subcategory.image, false, true)

    await _brklyn.telegram.sendPhoto(process.env.ADDITION_CHANNEL_ID!, image, { caption: firstPart, parse_mode: 'HTML' })
    await _brklyn.telegram.sendMessage(process.env.ADDITION_CHANNEL_ID!, secondPart, { parse_mode: 'HTML' })
    return
  }

  const image = parseImageString(subcategory.image, false, true)

  await _brklyn.telegram.sendPhoto(process.env.ADDITION_CHANNEL_ID!, image, { caption: text, parse_mode: 'HTML' })
}

export const notifySubcategoryImageChange = async (subcategory: Subcategory & { category: { emoji: string } }) => {
  if (!subcategory.image) return

  // if the subcategory is less than 24 h old, don't notify
  if (new Date().getTime() - subcategory.createdAt.getTime() < 24 * 60 * 60 * 1000) return

  const ddmmyyyy = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())

  const cardsInSubcategory = await _brklyn.db.card.count({ where: { OR: [{ subcategoryId: subcategory.id }, { secondarySubcategories: { some: { id: subcategory.id } } }] } })
  const text = `<b>♻️ Modificação de imagem</b>
📅 <b>${ddmmyyyy}</b>

${subcategory.category.emoji} <code>${subcategory.id}</code>. <b>${subcategory.name}</b> ${subcategory.isSecondary ? '(tag)' : ''}
🎲 <code>${cardsInSubcategory}</code> cards no total.`

  const image = parseImageString(subcategory.image, false, true)

  await _brklyn.telegram.sendPhoto(process.env.ADDITION_CHANNEL_ID!, image, { caption: text, parse_mode: 'HTML' })
}
