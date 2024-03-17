import { crudResolvers, relationResolvers } from '@generated/type-graphql'
import { buildSchema } from 'type-graphql'

export const schema = await buildSchema({
  validate: false,
  resolvers: [
    ...crudResolvers,
    ...relationResolvers
  ]
})
