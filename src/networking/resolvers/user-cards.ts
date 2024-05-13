import { Arg, Ctx, Field, Info, Int, Mutation, ObjectType, Query, Resolver } from 'type-graphql'
import { ShopItem, UserCard } from '@generated/type-graphql'
import { parseImageString } from '../../utilities/lucky-engine.js'
import { MISSING_CARD_IMG } from '../../constants.js'
import { buyStoreItem } from '../../utilities/engine/store.js'
import { getUserFromNamekeeper } from '../../utilities/telegram.js'
import { getSubcategoryByID } from '../../utilities/engine/subcategories.js'
import { getRarityByID } from '../../utilities/engine/rarity.js'
import { Subcategory } from '@prisma/client'
import { deleteCard, getCardByID, getCardByIDSimple } from '../../utilities/engine/cards.js'

interface CardDB {
  userId: number
  cardId: number
  count: number
  card: {
    id: number
    categoryId: number
    subcategoryId: number
    rarityId: number
    image: string
    name: string
    subcategory: {
      name: string
      id: number
    }
    rarity: {
      chance: number
      name: string
      id: number
    }
  }
}

@ObjectType({
  description: 'Subcategory information'
})
export class SubcategoryProgress {
  @Field(_type => Int, { nullable: false, description: 'The amount of cards the user has in this subcategory' })
  cardsOwned!: number

  @Field(_type => Int, { nullable: false, description: 'The amount of cards in this subcategory' })
  totalCards!: number

  // sub id
  @Field(_type => Int, { nullable: false, description: 'The subcategory id' })
  subcategoryId!: number

  // name
  @Field(_type => String, { nullable: false, description: 'The subcategory name' })
  subcategoryName!: string

  // subcategory image
  @Field(_type => String, { nullable: false, description: 'The subcategory image' })
  subcategoryImage!: string
}

// type that represents how many cards a user have
@ObjectType({ description: 'User card count' })
export class UserCardCountInfo {
  @Field(_type => Int, { nullable: false, description: 'The amount of cards the user has' })
  count!: number
  @Field(_type => Int, { nullable: false, description: 'The card id' })
  cardId!: number
  // user name

}

// type that represents an image for a card
@ObjectType({ description: 'Card image' })
export class CardImage {
  @Field(_type => String, { nullable: false, description: 'The card image' })
  image!: string
  @Field(_type => Int, { nullable: false, description: 'The card id' })
  cardId!: number
  // card count
  @Field(_type => Int, { nullable: false, description: 'The card count' })
  count!: number
}

// an object that contains user info (firstName, id, lastName)
@ObjectType({
  description: 'User information'
})
export class UserInfo {
  @Field(_type => String, { nullable: false, description: 'The user first name' })
  firstName!: string

  @Field(_type => String, { nullable: false, description: 'The user last name' })
  lastName!: string
}

// an object that contains subcategory info and a list of user cards
@ObjectType({
  description: 'Subcategory information with user cards'
})
export class SubcategoryProgressWithCards extends SubcategoryProgress {
  @Field(_type => [UserCard], { nullable: false, description: 'The user cards in this subcategory' })
  userCards!: UserCard[]
  // subcategory info
  @Field(_type => [SubcategoryProgress], { nullable: false, description: 'The subcategory info' })
  subcategoryInfo!: SubcategoryProgress[]

  @Field(_type => [UserCardCountInfo], { nullable: false, description: 'The user card count' })
  userCardCount!: UserCardCountInfo[]

  @Field(_type => [CardImage], { nullable: false, description: 'The card images' })
  cardImages!: CardImage[]

  // array of untradable cards
  @Field(_type => [Int], { nullable: false, description: 'The untradeable cards' })
  untradeableCards!: number[]

  @Field(_type => UserInfo, { nullable: false, description: 'The user info' })
  userInfo!: UserInfo
}

@ObjectType({
  description: 'Category representation'
})
export class CategoryGQL {
  @Field(_type => Int, { nullable: false, description: 'The category id' })
  id!: number

  @Field(_type => String, { nullable: false, description: 'The category name' })
  name!: string

  @Field(_type => String, { nullable: false, description: 'The category emoji' })
  emoji!: string
}

@ObjectType({
  description: 'Compact SubcategoryProgessWithCards, containing only the cards, if they are tradeable and their image'
})
export class CompactSubcategoryProgressWithCards {
  @Field(_type => [UserCard], { nullable: false, description: 'The user cards in this subcategory' })
  userCards!: UserCard[]

  @Field(_type => [CardImage], { nullable: false, description: 'The card images' })
  cardImages!: CardImage[]

  @Field(_type => [CategoryGQL], { nullable: false, description: 'The categories' })
  categories!: CategoryGQL[]
}

@Resolver()
export class UserCardsResolver {
  @Query(_returns => CompactSubcategoryProgressWithCards)
  async userCards (
    @Ctx() _: any,
    @Info() _a: any,
    // user ids are bigint
    @Arg('userId', _type => String, { nullable: false, description: 'The user id' }) userId: string,
    @Arg('page', _type => Int, { nullable: true, description: 'The page number' }) page: number = 0,
    @Arg('limit', _type => Int, { nullable: true, description: 'The limit' }) limit: number = 20
  ) {
    let cards: CardDB[] = await _brklyn.db.userCard.findMany({
      where: {
        user: {
          tgId: parseInt(userId)
        }
      },
      orderBy: {
        card: {
          categoryId: 'asc'
        }
      },
      skip: page * limit,
      take: limit,
      distinct: ['cardId']
    }) as unknown as CardDB[]

    if (cards.length === 0) return {
      userCards: [],
      cardImages: [],
      untradeableCards: []
    }

    let categoriesPresent: number[] = []

    // add subcategory, category and rarity data from cache
    cards = await Promise.all(cards.map(async card => {
      card.card = await getCardByIDSimple(card.cardId)
      if (!card.card) return null
      if (!categoriesPresent.includes(card.card.categoryId)) {
        categoriesPresent.push(card.card.categoryId)
      }

      // @ts-ignore
      card.card.subcategory = await getSubcategoryByID(card.card.subcategoryId!) as unknown as Subcategory
      card.card.rarity = await getRarityByID(card.card.rarityId)
      return card
    })).then((c) => {
      return c.filter((i) => i !== null)
    }) as unknown as CardDB[]

    // add count
    const userCardImages: any[] = []

    cards.forEach(card => {
      if (!userCardImages.find(c => c.cardId === card.card.id)) {
        userCardImages.push({
          cardId: card.card.id,
          image: card.card.image ? parseImageString(card.card.image, 'ar_3:4,c_crop', true) : MISSING_CARD_IMG
        })
      }
    })

    const categories = await _brklyn.db.category.findMany({
      where: {
        id: {
          in: categoriesPresent
        }
      }
    })

    return {
      userCards: cards,
      cardImages: userCardImages,
      categories: categories || []
    }
  }

  @Query(_returns => SubcategoryProgressWithCards)
  async fullUserCards (
    @Ctx() _: any,
    @Info() _a: any,
    // user ids are bigint
    @Arg('userId', _type => String, { nullable: false, description: 'The user id' }) userId: string,
  ) {
    // get all unique subcategories
    const subcategories = []
    let subcategoryInfo = await Promise.all(subcategories.map(async subcategoryId => {
      const totalCards = await _brklyn.db.card.count({
        where: {
          subcategoryId
        }
      })

      return {
        subcategoryId,
        totalCards,
        // @ts-ignore
        subcategoryName: subcategory?.name || '',
        // @ts-ignore
        subcategoryImage: subcategory?.image ? await parseImageString(subcategory.image, false) : MISSING_CARD_IMG
      }
    }))

    // sort subcategories by closest to completion
    subcategoryInfo = subcategoryInfo.sort((a, b) => {
      // @ts-ignore
      return (b.cardsOwned / b.totalCards) - (a.cardsOwned / a.totalCards)
    })

    const untradeableCards = await _brklyn.db.userCardPreferences.findMany({
      where: {
        user: {
          tgId: parseInt(userId)
        },
        tradeable: false
      }
    }).then((t) => {
      return t.map((i) => {
        return i.cardId
      })
    })

    const userInfoRaw = await getUserFromNamekeeper(userId)
    const userInfo = {
      firstName: userInfoRaw?.first_name || 'Usuário desconhecido',
      lastName: userInfoRaw?.last_name || ''
    }

    return {
      subcategoryInfo,
      untradeableCards,
      userInfo
    }
  }

  @Query(_returns => Int)
  async userCardsCount (
    @Ctx() _: any,
    @Info() _a: any,
    @Arg('userId', _type => String, { nullable: false, description: 'The user id' }) userId: string
  ) {
    return await _brklyn.db.userCard.count({
      where: {
        user: {
          tgId: parseInt(userId)
        }
      }
    })
  }

  @Mutation(_returns => Boolean)
  async deleteCard (
    @Arg('userId', _type => String, { nullable: false, description: 'The user id' }) userId: string,
    @Arg('cardId', _type => Int, { nullable: false, description: 'The card id' }) cardId: number
  ) {
    const card = await getCardByID(cardId)
    const user = await _brklyn.db.user.findUnique({ where: { tgId: parseInt(userId) } })
    if (!card || !user) return false
    await deleteCard(user.id, card)
    return true
  }

  @Mutation(_returns => Boolean)
  async markCardUntradeable (
    @Arg('userId', _type => String, { nullable: false, description: 'The user id' }) userId: string,
    @Arg('cardId', _type => Int, { nullable: false, description: 'The card id' }) cardId: number
  ) {
    const c = await _brklyn.db.userCardPreferences.findFirst({
      where: {
        user: { tgId: parseInt(userId) },
        card: { id: cardId }
      }
    })
    if (c) {
      await _brklyn.db.userCardPreferences.updateMany({
        where: {
          user: { tgId: parseInt(userId) },
          card: { id: cardId }
        },
        data: {
          tradeable: !c.tradeable
        }
      })
      return true
    }

    await _brklyn.db.userCardPreferences.create({
      data: {
        tradeable: false,
        user: { connect: { tgId: parseInt(userId) } },
        card: { connect: { id: cardId } }
      }
    })

    return true
  }

  @Query(_returns => [ShopItem])
  async storeItems (
    @Ctx() _: any,
    @Info() _a: any
  ) {
    const cached = await _brklyn.cache.get('store_items', 'main')
    if (cached) {
      return cached
    }

    const dRaw = await _brklyn.db.$queryRawUnsafe('SELECT * FROM "ShopItem" WHERE type = \'BACKGROUND\' ORDER BY RANDOM() LIMIT 40').then((d) => {
      return (d as ShopItem[]).map((i) => {
        i.image = parseImageString(i.image, false, undefined)
        return i
      })
    })

    const stRaw = await _brklyn.db.$queryRawUnsafe('SELECT * FROM "ShopItem" WHERE type = \'STICKER\' ORDER BY RANDOM() LIMIT 40').then((d) => {
      return (d as ShopItem[]).map((i) => {
        i.image = parseImageString(i.image, false, undefined)
        return i
      })
    })

    const draws = await _brklyn.db.shopItem.findMany({ where: { type: 'DRAWS' } })
    const d = [...dRaw, ...stRaw, ...draws]
    await _brklyn.cache.setexp('store_items', 'main', d, 2 * 60 * 60)
    return d
  }

  // search store items with a given text and optionally a type
  @Query(_returns => [ShopItem])
  async searchStoreItems (
    @Ctx() _: any,
    @Info() _a: any,
    @Arg('text', _type => String, { nullable: false, description: 'The search text' }) text: string,
    @Arg('type', _type => String, { nullable: true, description: 'The item type' }) type: string
  ) {
    const cached = await _brklyn.cache.get('store_items', text + type)
    if (cached) {
      return cached
    }

    let items = await _brklyn.db.shopItem.findMany({
      take: 30,
      orderBy: {
        _relevance: {
          fields: ['name', 'description'],
          search: text,
          sort: 'asc'
        }
      }
    })

    items = items.map((i) => {
      i.image = parseImageString(i.image, false, undefined)
      return i
    })

    await _brklyn.cache.setexp('store_items', text + type, items, 2 * 60 * 60)
    return items
  }

  @Mutation(_returns => Boolean)
  async buyItem (
    @Arg('userId', _type => String, { nullable: false, description: 'The user id' }) userId: string,
    @Arg('shopEntryId', _type => Int, { nullable: false, description: 'The shop entry id' }) shopEntryId: number,
    @Arg('quantity', _type => Int, { nullable: false, description: 'The quantity of items to buy' }) quantity: number
  ) {
    // get the shop entry
    const shopEntry = await _brklyn.db.shopItem.findUnique({
      where: {
        id: shopEntryId
      }
    })

    // if the shop entry is not found, return error
    if (!shopEntry) {
      return false
    }

    // get the user
    const user = await _brklyn.db.user.findUnique({
      where: {
        tgId: parseInt(userId)
      }
    })

    // if the user is not found, return error
    if (!user) {
      return false
    }

    return await buyStoreItem(user, shopEntry, quantity)
  }
}
