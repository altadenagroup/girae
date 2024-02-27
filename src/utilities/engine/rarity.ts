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
