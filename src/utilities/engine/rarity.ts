export const getRarityByName = async (name: string) => {
  const cached = await _brklyn.cache.get('rarities_name', name)
  if (cached) return cached

  const rarity = await _brklyn.db.rarity.findFirst({
    where: {
      name
    }
  })

  if (rarity) {
    await _brklyn.cache.setexp('rarities_name', name, rarity, 60 * 60 * 24)
  }

  return rarity
}

export const getAllRarities = async () => {
  const cached = await _brklyn.cache.get('rarities_all', 'all')
  if (cached) return cached

  const rarities = await _brklyn.db.rarity.findMany()
  await _brklyn.cache.setexp('rarities_all', 'all', rarities, 60 * 60)

  return rarities
}

export const getRarityByID = async (id: number) => {
  const cached = await _brklyn.cache.get('rarities_id', id.toString())
  if (cached) return cached

  const rarity = await _brklyn.db.rarity.findFirst({
    where: {
      id
    }
  })

  if (rarity) {
    await _brklyn.cache.setexp('rarities_id', id.toString(), rarity, 60)
  }

  return rarity
}
