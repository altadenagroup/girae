// the R²S engine (relative rarity system)
// for accurately determining the rarity of an item, given how many other items are in the same category

import { Rarity, Subcategory } from '@prisma/client'

// the bot works with a rarity system that is based on percentages. for an example, common items should account for 60% of all drops from a category, rare is 30% and legendary is 10%.
// the problem is that, sometimes a category will have more legendary items than common ones, and that will make the legendary items less rare than the common ones.
// the R²S engine solves this problem by calculating the relative rarity of an item, given how many other items are in the same category.

// the engine is based on the following formula:
// R² = (R / S) * 100
// where R is the rarity of the item and S is the sum of all rarities in the category.

export const calculateRelativeRarity = async (rarity: Rarity, subcategory: Subcategory) => {
  // get the sum of all rarities in the category
  const rarities = await _brklyn.db.card.findMany({
    where: {
      subcategoryId: subcategory.id
    },
    select: {
      rarity: true
    }
  })

  // rarities are expressed in 0-1 range, so we need to convert them to percentages
  const sum = rarities.reduce((acc, cur) => acc + cur.rarity.chance, 0) * 100

  // calculate the relative rarity
  return Math.sin((rarity.chance / sum) * 100) * 10
}

export const getRelativeRarity = async (rarity: Rarity, subcategory: Subcategory) => {
  const cached = await _brklyn.cache.get('r2s', `${rarity.id}:${subcategory.id}`)
  if (cached) return cached

  const relativeRarity = await calculateRelativeRarity(rarity, subcategory)
  await _brklyn.cache.set('r2s', `${rarity.id}:${subcategory.id}`, relativeRarity)
  return relativeRarity
}
