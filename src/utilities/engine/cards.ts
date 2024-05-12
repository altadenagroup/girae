import { Card, Category, Rarity, Subcategory, User } from '@prisma/client'
import { getSubcategoryByID } from './subcategories.js'
import { getRarityForUserDraw } from './users.js'
import { getRarityById } from '../lucky-engine.js'
import { getCategoryByID } from './category.js'
import { getRandomNumber } from '../misc.js'
import { addBalance } from './economy.js'
import { CARD_DELETION_REWARD } from '../../constants.js'

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
      return _brklyn.db.card.update({
        where: {
          id: card.id
        },
        data: {
          rarityId: rarityID
        }
      })
    }
  }
  return _brklyn.db.card.create({
    data: {
      name,
      subcategoryId: sub.id,
      categoryId: categoryID,
      rarityId: rarityID,
      image,
      rarityModifier
    }
  })
}

export const getCardByID = async (id: number | undefined) => {
  if (!id) return null
  return _brklyn.db.card.findFirst({
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
  return _brklyn.db.card.findFirst({
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

// determines the actual chance of drawing a certain rarity for a subcategory.
// for an example: if a subcatgeory has 100 cards (10 common, 30 rare, 60 legendary), the function has to adequate the rarity values given the amount of cards.
// so, since the chance of drawing a legendary card is 0.15, the function has to return a value that is lower than 0.15, so legendary cards can be less common than they are.
export const getRarityChanceForSubcategory = async (subcategory: Subcategory, rarity: Rarity) => {
  const cards = await _brklyn.db.card.count({
    where: {
      subcategoryId: subcategory.id
    }
  })

  const rarityCount = await _brklyn.db.card.count({
    where: {
      subcategoryId: subcategory.id,
      rarityId: rarity.id
    }
  })

  return rarityCount / cards
}

export const registerDrawnCard = async (cardID: number) => {
  return _brklyn.cache.incr('cards_draws', cardID.toString())
}

export const getDrawnCardCount = async (cardID: number) => {
  return _brklyn.cache.get('cards_draws', cardID.toString())
}

// selects a random card given a rarity, a category and a subcategory.
export const selectRandomCard = async (rarity: Rarity, category: Category, subcategory: Subcategory, noRarity: boolean = false) => {
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
    id: number
  }[]>(
    `
    SELECT * FROM "Card" WHERE "categoryId" = ${category.id} AND "subcategoryId" = ${subcategory.id}${!noRarity ? (' AND "rarityId" = '+ rarity.id.toString()) : ''};
    `
  )

  if (cards.length === 0) {
    // just return the first card in the subcategory
    if (!noRarity) return selectRandomCard(rarity, category, subcategory, true)

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

  // lendario -> 0.15
  // 0.547868932767
  // 0.46797977

  // take one of the cards
  let card = cards[Math.floor(getRandomNumber() * cards.length)]
  // get how many times the card has been drawn. if it is a mutiple of 3, we'll draw another card.
  const drawn = await getDrawnCardCount(card.id)
  if (drawn && drawn % 3 === 0) {
    if (cards.length === 1) {
      // we'll get the first card in the subcategory, orded by random
      const cards = await _brklyn.db.$queryRawUnsafe<Card & {
        rarity: Rarity,
        category: Category,
        subcategory: Subcategory
        rarityModifier: number
        rarityId: number
        categoryId: number
        subcategoryId: number
        id: number
      }[]>(
        `
        SELECT * FROM "Card" WHERE "subcategoryId" = ${subcategory.id} ORDER BY RANDOM() LIMIT 10;
        `
      )
      card = cards[Math.floor(getRandomNumber() * cards.length)]
    } else {
      // select a card that is'nt the one we already have
      const filtered = cards.filter((c) => c.id !== card.id)
      card = filtered[Math.floor(getRandomNumber() * filtered.length)]
    }
  }

  card.rarity = await getRarityById(card.rarityId) as Rarity
  card.category = await getCategoryByID(card.categoryId) as Category
  card.subcategory = await getSubcategoryByID(card.subcategoryId!) as Subcategory

  if (card.rarityModifier !== 0) {
    const roll = getRandomNumber()
    const totalRarity = card.rarityModifier + card!.rarity.chance

    if (roll < totalRarity) {
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
  if (user.usedDraws > user.maximumDraws) return 'NO_DRAWS'
  const rarity = await getRarityForUserDraw(user)
  const card = await selectRandomCard(rarity, category, subcategory)
  if (!card) return null
  await addCard(user, card)
  return card
}

// performs a full text search on the cards (their name, subcategory and category)
export const searchCards = async (query: string, limit: number = 10) => {
  return _brklyn.db.card.findMany({
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
  return _brklyn.db.card.findMany({
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
  return _brklyn.db.card.findMany({
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
  if (!subcategory.isSecondary) {
    return _brklyn.db.card.count({
      where: {
        subcategoryId: subcategory.id
      }
    })
  } else {
    return _brklyn.db.card.count({
      where: { secondarySubcategories: { some: { id: subcategory.id } } }
    })
  }
}

export const getCardsOnSubcategoryOwnedByUser = async (subcategory: Subcategory, user: User) => {
  if (subcategory.isSecondary) {
    return _brklyn.db.userCard.findMany({
      where: {
        userId: user.id,
        card: {
          secondarySubcategories: {
            some: {
              id: subcategory.id
            }
          }
        }
      },
      include: {
        card: {
          include: {
            rarity: true,
            category: true,
            subcategory: true
          }
        }
      }
    })
  }

  return _brklyn.db.userCard.findMany({
    where: {
      userId: user.id,
      card: {
        subcategoryId: subcategory.id
      }
    },
    include: {
      card: {}
    }
  })
}

export const getCountCardsOnSubcategoryOwnedByUser = async (subcategory: Subcategory, user: User) => {
  if (subcategory.isSecondary) {
    return _brklyn.db.userCard.count({
      where: {
        userId: user.id,
        card: {
          secondarySubcategories: {
            some: {
              id: subcategory.id
            }
          }
        }
      }
    })
  }
  return _brklyn.db.userCard.count({
    where: {
      userId: user.id,
      card: {
        subcategoryId: subcategory.id
      }
    }
  })
}

export const getHowManyCardsAreThere = async (cardID: number) => {
  const cached = await _brklyn.cache.get('cards_draws', cardID.toString())
  if (cached) return cached

  const aa = await _brklyn.db.userCard.count({
    where: {
      cardId: cardID
    }
  })

  await _brklyn.cache.setexp('cards_draws', cardID.toString(), aa, 30 * 60)
  return aa
}

export const getNamesOfSecondarySubcategories = async (cardID: number) => {
  return _brklyn.db.subcategory.findMany({
    where: {
      secondaryCards: {
        some: {
          id: cardID
        }
      },
      isSecondary: true
    },
    select: {
      name: true
    }
  })
}

// transfers cards between two users. the cards are not deleted, they are just transferred by editing the userId.
export const transferCards = async (from: User, to: User, cardIds: number[]) => {
  return _brklyn.db.userCard.updateMany({
    where: {
      userId: from.id,
      cardId: {
        in: cardIds
      }
    },
    data: {
      userId: to.id
    }
  })
}

// deletes repeated cards and generates a new card document with the count property
export const migrateCardToNewCountSystem = async (userId: number, cardId: number) => {
  if (await _brklyn.cache.get('card-mig', `${userId}:${cardId}`)) return _brklyn.db.userCard.findFirst({ where: { userId, cardId } })

  const count = await _brklyn.db.userCard.count({
    where: {
      userId,
      cardId
    }
  })

  if (count <= 1) return _brklyn.db.userCard.findFirst({ where: { userId, cardId } })

  await _brklyn.db.$transaction([
    _brklyn.db.userCard.deleteMany({
      where: {
        userId,
        cardId
      }
    }),
    _brklyn.db.userCard.create({
      data: {
        userId,
        cardId,
        count
      }
    })
  ])

  await _brklyn.cache.setexp('card-mig', `${userId}:${cardId}`, count, 30 * 60)
  return _brklyn.db.userCard.findFirst({ where: { userId, cardId } })
}

export const deleteCard = async (userId: number, card: Card) => {
  // find first card w conditions
  const userCard = await _brklyn.db.userCard.findFirst({ where: { userId, cardId: card.id } })
  if (!userCard) return null
  return _brklyn.db.$transaction([
    _brklyn.db.userCard.deleteMany({ where: { id: userCard!.id } }),
    addBalance(userId, CARD_DELETION_REWARD[card.rarityId])
  ])
}

export const getCardByIDSimple = async (id: number) => {
  const cached = await _brklyn.cache.get('cardByIDsim', id.toString())
  if (cached) return cached
  const card = await _brklyn.db.card.findFirst({
    where: {
      id
    }
  })
  if (card) await _brklyn.cache.setexp('cardByIDsim', id.toString(), card, 15)
  return card
}
