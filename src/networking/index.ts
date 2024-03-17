import { ApolloServer } from "@apollo/server"
import { schema } from "./graphql.js"
import { startStandaloneServer } from "@apollo/server/standalone"
import { info } from 'melchior'

export const bootstrap = () => {
  const server = new ApolloServer({ schema })
  startStandaloneServer(server, {
    listen: { port: process.env.PORT ? parseInt(process.env.PORT) : 6788 }
  }).then((d) => {
    info('graphql', `server started @ ${d.url}`)
  })
}
