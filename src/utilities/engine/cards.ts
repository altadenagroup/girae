import { Card, Category, Rarity, Subcategory, User } from "@prisma/client"
import { getSubcategoryByID } from "./subcategories.js"
import { info, error } from "melchior"

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
export const addCard = async (user: User, card: Card): Promise<void> => {
  // before adding, we have to check the luck modifier for the card. if it's higher than 0, we will roll a random number and check if it's lower than the luck modifier.
  // if it isn't, we will reroll the card.
  if (card.rarityModifier > 0) {
      info('luckyEngine', `user ${user.tgId} is rolling for a lucky card: ${card.name}`)
      const random = Math.random()
      if (card.rarityModifier >= random) {
          info('luckyEngine', `user ${user.tgId} got a lucky card: ${card.name}`)
      } else {
          // we will reuse the same rarity, category and subcategory to get a new card.
          const rarity = await _brklyn.db.rarity.findFirst({ where: { id: card.rarityId } })
          const category = await _brklyn.db.category.findFirst({ where: { id: card.categoryId } })
          const subcategory = await _brklyn.db.subcategory.findFirst({ where: { id: card.subcategoryId! } })
          const newCard = await selectRandomCard(rarity!, category!, subcategory!)
          return addCard(user, newCard)
      }
  }

  await _brklyn.db.userCard.create({
      data: {
          userId: user.id,
          cardId: card.id
      }
  })
}

// selects a random card given a rarity, a category and a subcategory.
export const selectRandomCard = async (rarity: Rarity, category: Category, subcategory: Subcategory, recursing: boolean = false): Promise<Card> => {
  let opts: { rarityId?: number } = {}
  if (!recursing) opts.rarityId = rarity.id

  const cards = await _brklyn.db.card.findMany({
      where: {
          ...opts,
          categoryId: category.id,
          subcategoryId: subcategory.id
      },
      include: {
          rarity: true,
          category: true,
          subcategory: true
      }
  }).catch((e) => {
    error('luckyEngine', `got a prisma error: ${e}`)
    return []
  })

  if (cards.length === 0) {
      if (recursing) {
        error('luckyEngine', `no cards found for rarity ${rarity.name}, category ${category.name} and subcategory ${subcategory.name}`)
        throw new Error('No cards found')
      }
      return selectRandomCard(rarity, category, subcategory, true)
  }
  return cards[Math.floor(Math.random() * cards.length)]
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
