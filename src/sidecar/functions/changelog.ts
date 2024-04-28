export const getCardsCreatedInLast24Hours = async () => {
  const cards = await _brklyn.db.card.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    include: { rarity: true, subcategory: true }
  })

  return cards
}

export const getSubcategoriesCreatedInLastNHours = async (hours: number) => {
  const subcategories = await _brklyn.db.subcategory.findMany({
    where: { createdAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) } }
  })

  return subcategories
}

