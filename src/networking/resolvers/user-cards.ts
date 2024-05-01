import { Arg, Ctx, Field, Info, Int, Mutation, ObjectType, Query, Resolver } from 'type-graphql'
import { ShopItem, UserCard } from '@generated/type-graphql'
import { parseImageString } from '../../utilities/lucky-engine.js'
import { MISSING_CARD_IMG } from '../../constants.js'
import { buyStoreItem } from '../../utilities/engine/store.js'
import { getUserFromNamekeeper } from '../../utilities/telegram.js'

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

@Resolver()
export class UserCardsResolver {
  @Query(_returns => SubcategoryProgressWithCards)
  async fullUserCards (
    @Ctx() _: any,
    @Info() _a: any,
    // user ids are bigint
    @Arg('userId', _type => String, { nullable: false, description: 'The user id' }) userId: string,
    @Arg('page', _type => Int, { nullable: true, description: 'The page number' }) page: number = 1
  ) {
    let cards = await _brklyn.db.userCard.findMany({
      where: {
        user: {
          tgId: parseInt(userId)
        }
      },
      include: {
        card: {
          include: {
            subcategory: true,
            rarity: true,
            category: true
          }
        }
      },
      take: 500,
      skip: (page - 1) * 500
    })

    let userCardCount: any[] = []
    let userCardImages: any[] = []
    // sort cards by rarity and add image. also add
    cards = cards.sort((a, b) => {
      return a.card.rarity.chance - b.card.rarity.chance
    })

    // add count
    cards.forEach(card => {
      if (userCardCount.find(c => c.cardId === card.card.id)) {
        userCardCount.find(c => c.cardId === card.card.id)!.count += 1
      } else {
        userCardCount.push({
          count: 1,
          cardId: card.card.id
        })
      }

      if (!userCardImages.find(c => c.cardId === card.card.id)) {
        userCardImages.push({
          cardId: card.card.id,
          image: card.card.image ? parseImageString(card.card.image, 'ar_3:4,c_crop', true) : MISSING_CARD_IMG
        })
      }
    })

    // remove duplicates, use card.id as the unique identifier
    cards = Array.from(new Set(cards.map(card => card.card.id)).values()).map(cardId => {
      return cards.find(card => card.card.id === cardId)!
    })

    // get all unique subcategories
    const subcategories = Array.from(new Set(cards.map(card => card.card.subcategoryId)))
    let subcategoryInfo = await Promise.all(subcategories.map(async subcategoryId => {
      const totalCards = await _brklyn.db.card.count({
        where: {
          subcategoryId
        }
      })

      // remove duplicates
      const cardsOwned = Array.from(new Set(cards.filter(card => card.card.subcategoryId === subcategoryId).map(card => card.cardId)).values()).length
      // get image and name for the subcategory from the first card
      const subcategory = cards.find(card => card.card.subcategoryId === subcategoryId)?.card.subcategory
      return {
        subcategoryId,
        totalCards,
        cardsOwned,
        subcategoryName: subcategory?.name || '',
        subcategoryImage: subcategory?.image ? await parseImageString(subcategory.image, false) : MISSING_CARD_IMG
      }
    }))

    // sort subcategories by closest to completion
    subcategoryInfo = subcategoryInfo.sort((a, b) => {
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
      userCards: cards,
      userCardCount,
      cardImages: userCardImages,
      untradeableCards,
      userInfo
    }
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
