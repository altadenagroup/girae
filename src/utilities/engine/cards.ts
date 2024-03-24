import { Card, Category, Rarity, Subcategory, User } from '@prisma/client'
import { getSubcategoryByID } from './subcategories.js'
import { getRarityForUserDraw } from './users.js'
import { getRarityById } from '../lucky-engine.js'
import { getCategoryByID } from './category.js'

export interface CreateCardOptions {
  name: string
  subcategoryID: number
  categoryID: number
  rarityID: number
  image: string
  rarityModifier: number
}

export const createCard = async (options: CreateCardOptions) => {
  const { name, subcategoryID, categoryID, rarityID, image, rarityModifier } = options
  const sub = await getSubcategoryByID(subcategoryID)
  if (!sub) throw new Error(`Subcategory with ID ${subcategoryID} does not exist.`)

  // first, we'll check if the card already exists by checking if there's a card with the same name and the same subcategory name.
  const card = await _brklyn.db.card.findFirst({
    where: {
      name,
      subcategory: {
        name: sub.name
      }
    }
  })

  if (card) {
    // if the only difference is the rarity, we'll update the rarity and return the card.
    if (card.rarityId !== rarityID) {
      const updatedCard = await _brklyn.db.card.update({
        where: {
          id: card.id
        },
        data: {
          rarityId: rarityID
        }
      })
      return updatedCard
    }
  }
  const newCard = await _brklyn.db.card.create({
    data: {
      name,
      subcategoryId: sub.id,
      categoryId: categoryID,
      rarityId: rarityID,
      image,
      rarityModifier
    }
  })

  return newCard
}

export const getCardByID = async (id: number | undefined) => {
  if (!id) return null
  return await _brklyn.db.card.findFirst({
    where: {
      id
    },
    include: {
      rarity: true,
      category: true,
      subcategory: true
    }
  })
}

export const getCardFullByID = async (id: number | undefined) => {
  if (!id) return null
  return await _brklyn.db.card.findFirst({
    where: {
      id
    },
    include: {
      rarity: true,
      category: true,
      subcategory: true
    }
  })
}

// gets the card by the name (case insensitive)
export const getCardByName = async (name: string) => {
  const cached = await _brklyn.cache.get('cardByNames', name.toLowerCase())
  if (cached) return cached
  // search given the tags, the card name and the subcategory
  const card = await _brklyn.db.card.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive'
      }
    },
    include: {
      rarity: true,
      category: true,
      subcategory: true
    }
  })
  if (card) await _brklyn.cache.setexp('cardByNames', name.toLowerCase(), card, 30 * 60)
  return card
}

export const getCardByNameAndSubcategory = async (name: string, subcategoryName: string) => {
  const cached = await _brklyn.cache.get('cardByNameAndSubcategory', `${name.toLowerCase()}:${subcategoryName.toLowerCase()}`)
  if (cached) return cached
  const card = await _brklyn.db.card.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive'
      },
      subcategory: {
        name: {
          equals: subcategoryName,
          mode: 'insensitive'
        }
      }
    }
  })
  if (card) await _brklyn.cache.setexp('cardByNameAndSubcategory', `${name.toLowerCase()}:${subcategoryName.toLowerCase()}`, card, 30 * 60)
  return card
}

// adds a card to the user's collection.
export const addCard = async (user: User, card: Card & {
  rarity: Rarity,
  category: Category,
  subcategory: Subcategory | null
}): Promise<void> => {
  await _brklyn.db.userCard.create({
    data: {
      userId: user.id,
      cardId: card.id
    }
  })
}

// selects a random card given a rarity, a category and a subcategory.
export const selectRandomCard = async (rarity: Rarity, category: Category, subcategory: Subcategory) => {
  // rarity fallback
  if (!rarity) rarity = await getRarityById(1) as Rarity

  // cards as a raw query for better performance
  const cards = await _brklyn.db.$queryRawUnsafe<Card & {
    rarity: Rarity,
    category: Category,
    subcategory: Subcategory
    rarityModifier: number
    rarityId: number
    categoryId: number
    subcategoryId: number
  }[]>(
    `
    SELECT * FROM "Card" WHERE "categoryId" = ${category.id} AND "subcategoryId" = ${subcategory.id} AND "rarityId" = ${rarity.id} ORDER BY RANDOM() LIMIT 1;
    `
  )

  if (cards.length === 0) {
    // just return the first card in the subcategory
    return _brklyn.db.card.findFirst({
      where: {
        subcategoryId: subcategory.id
      },
      orderBy: {
        rarityId: 'asc'
      },
      include: {
        rarity: true,
        category: true,
        subcategory: true
      }
    })
  }


  const card = cards[0]
  card.rarity = await getRarityById(card.rarityId) as Rarity
  card.category = await getCategoryByID(card.categoryId) as Category
  card.subcategory = await getSubcategoryByID(card.subcategoryId!) as Subcategory

  if (card.rarityModifier !== 0) {
    const roll = Math.random()
    const totalRarity = card.rarityModifier + card!.rarity.chance

    if (roll > totalRarity) {
      let rarityToUse = 1
      if (roll > 0.65) rarityToUse = 3
      if (roll > 0.85) rarityToUse = 4
      card.rarity = await getRarityById(rarityToUse) as Rarity

      return selectRandomCard(card.rarity!, card.category!, card.subcategory!)
    }
  }

  return card
}

export const drawCard = async (user: User, category: Category, subcategory: Subcategory) => {
  const rarity = await getRarityForUserDraw(user)
  const card = await selectRandomCard(rarity, category, subcategory)
  if (!card) return null
  if (user.usedDraws > user.maximumDraws) return 'NO_DRAWS'
  await addCard(user, card)
  return card
}

// performs a full text search on the cards (their name, subcategory and category)
export const searchCards = async (query: string, limit: number = 10) => {
  return await _brklyn.db.card.findMany({
    where: {
      name: {
        search: query
      }
    },
    include: {
      rarity: true,
      category: true,
      subcategory: true
    },
    take: limit
  })
}

const caseEveryInitial = (str: string) => {
  return str.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export const getCardsByTag = async (tag: string) => {
  // case insensitive search
  return await _brklyn.db.card.findMany({
    where: {
      tags: {
        hasSome: [tag, tag.toLowerCase(), tag.toUpperCase(), caseEveryInitial(tag)]
      }
    },
    include: {
      rarity: true,
      category: true,
      subcategory: true
    }
  })
}

export const getCardsBySubcategory = async (subcategory: Subcategory) => {
  return await _brklyn.db.card.findMany({
    where: {
      subcategoryId: subcategory.id
    },
    include: {
      rarity: true,
      category: true,
      subcategory: true
    }
  })
}

export const getCountOfCardsBySubcategory = async (subcategory: Subcategory) => {
  return await _brklyn.db.card.count({
    where: {
      subcategoryId: subcategory.id
    }
  })
}

export const getCardsOnSubcategoryOwnedByUser = async (subcategory: Subcategory, user: User) => {
  return await _brklyn.db.userCard.findMany({
    where: {
      userId: user.id,
      card: {
        subcategoryId: subcategory.id
      }
    },
    include: {
      card: {
      }
    }
  })
}

export const getCountCardsOnSubcategoryOwnedByUser = async (subcategory: Subcategory, user: User) => {
  return await _brklyn.db.userCard.count({
    where: {
      userId: user.id,
      card: {
        subcategoryId: subcategory.id
      }
    }
  })
}

export const getHowManyCardsAreThere = async (cardID: number) => {
  return await _brklyn.db.userCard.count({
    where: {
      cardId: cardID
    }
  })
}

export const getFirstUserCard = async (userId: number, cardId: number) => {
  return await _brklyn.db.userCard.findFirst({
    where: {
      userId,
      cardId
    }
  })
}

export const getUserCardByID = async (id: number) => {
  return await _brklyn.db.userCard.findFirst({
    where: {
      id
    }
  })
}

export const deleteUserCard = async (id: number) => {
  return await _brklyn.db.userCard.delete({
    where: {
      id
    }
  })
}
