import { crudResolvers, relationResolvers } from '@generated/type-graphql'
import { buildSchema } from 'type-graphql'
import * as userCards from './resolvers/user-cards.js'

export const schema = await buildSchema({
  validate: false,
  resolvers: [
    ...crudResolvers,
    ...relationResolvers,
    userCards.UserCardsResolver
  ],
  // also add the custom types
  orphanedTypes: [
    userCards.SubcategoryProgress,
    userCards.SubcategoryProgressWithCards,
    userCards.UserCardCountInfo,
    userCards.CardImage
  ]
})
