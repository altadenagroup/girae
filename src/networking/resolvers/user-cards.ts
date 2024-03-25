import { Arg, Ctx, Field, Info, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { UserCard } from '@generated/type-graphql'
import { parseImageString } from "../../utilities/lucky-engine.js";
import { BigIntResolver, BigIntTypeDefinition } from "graphql-scalars";
import { MISSING_CARD_IMG } from "../../constants.js";

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
}

// type that represents an image for a card
@ObjectType({ description: 'Card image' })
export class CardImage {
  @Field(_type => String, { nullable: false, description: 'The card image' })
  image!: string
  @Field(_type => Int, { nullable: false, description: 'The card id' })
  cardId!: number
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
}

@Resolver()
export class UserCardsResolver {
  @Query(_returns => SubcategoryProgressWithCards)
  async fullUserCards(
    @Ctx() _: any,
    @Info() _a: any,
    // user ids are bigint
    @Arg('userId', _type => String, { nullable: false, description: 'The user id' }) userId: string
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
      }
    })

    let userCardCount: any[] = []
    let userCardImages: any[] = []
    // sort cards by rarity and add image. also add
    cards = cards.sort((a, b) => {
      return a.card.rarity.chance - b.card.rarity.chance
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

    cards = cards.map(card => {
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
      return card
    })

    return {
      subcategoryInfo,
      userCards: cards,
      userCardCount,
      cardImages: userCardImages
    }
  }
}
