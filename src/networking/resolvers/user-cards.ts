import { Arg, Ctx, Field, Info, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { UserCard } from '@generated/type-graphql'
import { parseImageString } from "../../utilities/lucky-engine.js";
import { BigIntTypeDefinition } from "graphql-scalars";

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
}

@Resolver()
export class UserCardsResolver {
  @Query(_returns => SubcategoryProgressWithCards)
  async fullUserCards(
    @Ctx() _: any,
    @Info() _a: any,
    @Arg('userId', _type => Int) userId: number
  ) {
    const cards = await _brklyn.db.userCard.findMany({
      where: {
        user: {
          tgId: userId
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
        subcategoryImage: subcategory?.image ? await parseImageString(subcategory.image) : ''
      }
    }))

    // sort subcategories by closest to completion
    subcategoryInfo = subcategoryInfo.sort((a, b) => {
      return (b.cardsOwned / b.totalCards) - (a.cardsOwned / a.totalCards)
    })

    return {
      subcategoryInfo,
      userCards: cards
    }
  }
}
