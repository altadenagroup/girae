import { Subcategory } from '@prisma/client'
import { getRandomNumber } from '../misc.js'
import { getCardsByTag } from './cards.js'

export const createSubcategory = async (name: string, categoryID: number) => {
  return _brklyn.db.subcategory.create({
    data: {
      name,
      categoryId: categoryID
    }
  })
}

export const getSubcategoryByID = async (id: number): Promise<Subcategory | null | undefined> => {
  return _brklyn.db.subcategory.findUnique({
    where: {
      id
    },
    include: {
      category: true
    }
  })
}

export const getSubcategoryByName = async (name: string, isSecondary: boolean = false) => {
  const cached = await _brklyn.cache.get('subcategories_name', name + isSecondary)
  if (cached) return cached

  let subcategory = await _brklyn.db.subcategory.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive'
      },
      isSecondary: isSecondary
    },
    include: {
      category: true
    }
  })

  if (!subcategory) {
    subcategory = await _brklyn.db.subcategory.findFirst({
      where: {
        aliases: {
          has: name.toLowerCase()
        },
        isSecondary: isSecondary
      },
      include: {
        category: true
      }
    })
  }

  if (subcategory) {
    await _brklyn.cache.setexp('subcategories_name', name + isSecondary, subcategory, 10)
  }

  return subcategory
}

export const searchSubcategories = async (name: string, isSecondary: boolean = false) => {
  const cached = await _brklyn.cache.get('subcategories_search', name + isSecondary)
  if (cached) return cached

  const subcategories = await _brklyn.db.subcategory.findMany({
    where: {
      name: {
        search: name
      },
      isSecondary: isSecondary ? true : {}
    },
    include: {
      category: true
    }
  })

  if (subcategories) {
    await _brklyn.cache.setexp('subcategories_search', name + isSecondary, subcategories, 5 * 60)
  }

  return subcategories
}

export const getOrCreateSubcategory = async (name: string, categoryID: number) => {
  const sub = await getSubcategoryByName(name)
  if (sub) return sub
  return createSubcategory(name, categoryID)
}

export const getSubcategoriesByCategoryID = async (categoryID: number) => {
  return _brklyn.db.subcategory.findMany({
    where: {
      categoryId: categoryID
    }
  })
}

// filters subcategory by their chance. if a subcategory has a chance value, it will be taken into consideration. if the chance is 1, it is guaranteed to be selected. if it is 0.7, it has a 70% chance of being selected.
// subcategories with a chance of 0 will be randomly selected. has a limit of how many subcategories to return.
export const getRandomSubcategories = async (categoryID: number, limit: number) => {
  const subcategories = await _brklyn.db.subcategory.findMany({
    where: {
      categoryId: categoryID,
      isSecondary: false,
      cards: { some: {} }
    }
  })

  if (subcategories.length <= limit) return subcategories

  const result: Subcategory[] = []
  const chanceSubcategories = subcategories.filter(sub => sub.rarityModifier)
  chanceSubcategories.forEach(sub => {
    const random = getRandomNumber()
    if ((random < sub.rarityModifier) && !result.some(s => s.id === sub.id) && result.length < limit) result.push(sub)
  })

  while (result.length < limit) {
    const t = subcategories[Math.floor(getRandomNumber() * subcategories.length)]
    if (!result.some(sub => sub.id === t.id)) result.push(t)
  }

  return result
}

// migrates all cards with a certain tag to a new secondary subcategory
export const migrateCardsToSubcategory = async (tagName: string) => {
  const cards = await getCardsByTag(tagName)
  if (!cards[0]) return

  // if there's already a subcategory with the same name, return it
  const existing = await getSubcategoryByName(tagName, true)
  if (existing) {
    await Promise.allSettled(cards.map(card => {
      return _brklyn.db.card.update({
        where: {
          id: card.id
        },
        data: {
          secondarySubcategories: { connect: { id: existing.id } },
          tags: card.tags.filter(tag => tag !== existing.name)
        }
      })
    }))

    return existing
  }

  const sub = await _brklyn.db.subcategory.create({
    data: {
      name: cards[0].tags.filter(tag => tag.toLowerCase() === tagName.toLowerCase())[0],
      isSecondary: true,
      categoryId: cards[0].categoryId
    }
  })

  await Promise.all(cards.map(card => {
    return _brklyn.db.card.update({
      where: {
        id: card.id
      },
      data: {
        secondarySubcategories: { connect: { id: sub.id } },
        tags: card.tags.filter(tag => tag !== sub.name)
      }
    })
  }))

  return getSubcategoryByID(sub.id)
}

export const getCardsFromSubcategory = async (subcategoryID: number) => {
  const cached = await _brklyn.cache.get('subcategories_cards', subcategoryID.toString())
  if (cached) return cached

  const cards = await _brklyn.db.card.findMany({
    where: {
      OR: [
        { subcategoryId: subcategoryID },
        { secondarySubcategories: { some: { id: subcategoryID } } }
      ]
    }
  })

  if (cards) {
    await _brklyn.cache.setexp('subcategories_cards', subcategoryID.toString(), cards, 60 * 60)
  }

  return cards
}

export const getCountOfCardsOnSubcategory = async (subcategoryID: number) => {
  const cached = await _brklyn.cache.get('subcategories_card_count', subcategoryID.toString())
  if (cached) return cached

  const count = await _brklyn.db.card.count({
    where: {
      OR: [
        { subcategoryId: subcategoryID },
        { secondarySubcategories: { some: { id: subcategoryID } } }
      ]
    }
  })

  if (!count) return 0
  await _brklyn.cache.setexp('subcategories_card_count', subcategoryID.toString(), count, 60 * 60 * 24)

  return count
}

export interface SubcategoryWithCompletionInfo extends Subcategory {
  totalCards: number
  userOwned: number
}

// checks if a user has completed a certain subcategory (if they have all cards in it)
export const getSubcategoryForUser = async (userID: number, subcategoryID: number): Promise<SubcategoryWithCompletionInfo | null> => {
  const cached = await _brklyn.cache.get('subcategories_user', userID.toString() + subcategoryID.toString())
  if (cached) return cached

  const cards = await _brklyn.db.userCard.findMany({
    where: {
      userId: userID,
      card: {
        OR: [
          { subcategoryId: subcategoryID },
          { secondarySubcategories: { some: { id: subcategoryID } } }
        ]
      }
    },
    select: {
      cardId: true
    },
    distinct: ['cardId']
  })

  if (!cards[0]) return null

  const sub = await getSubcategoryByID(subcategoryID) as Subcategory
  const subcategoryCards = await getCountOfCardsOnSubcategory(subcategoryID)
  const data = {
    ...sub,
    totalCards: subcategoryCards,
    userOwned: cards.length
  }

  await _brklyn.cache.setexp('subcategories_user', userID.toString() + subcategoryID.toString(), data, 60 * 60)
  return data
}

export const getSubcategoriesForUser = async (userID: number) => {
  const cached = await _brklyn.cache.get('subcategories_user_all', userID.toString())
  if (cached) return cached

  await _brklyn.cache.setexp('subcategories_user_all', userID.toString(), null, 60 * 60)
  return null
}
