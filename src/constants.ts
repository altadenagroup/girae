export const MISSING_CARD_IMG = 'https://placehold.co/400x624.png?text=Use+/setimage+id+para+trocar%20esta%20imagem.'
export const MEDAL_MAP = {
  'Comum': '🥉',
  'Raro': '🥈',
  'Lendário': '🥇'
}

export const NUMBER_EMOJIS = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']

export const formatCard = (c) => MEDAL_MAP[c.rarity.name || c.rarity] + ` <code>${c.id}</code>. <b>${c.name}</b> (${c.subcategory?.name || c.subcategory})`
