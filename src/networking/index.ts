import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { info } from 'melchior'
import { fastify } from 'fastify'

const app = process.env.MAIN_CONTAINER ? null : fastify()

export const bootstrapGQLServer = async () => {
  const { schema } = await import('./graphql.js')

  const server = new ApolloServer({ schema })
  startStandaloneServer(server, {
    listen: { port: process.env.PORT ? parseInt(process.env.PORT) : 6788 }
  }).then((d) => {
    info('graphql', `server started @ ${d.url}`)
  })
}

export const bootstrap = async () => {
  if (process.env.MAIN_CONTAINER) {
    await bootstrapGQLServer()
  } else {
    const webhook = await _brklyn.createWebhook({
      domain: 'girae-ingress.altadena.space'
    })

    // @ts-ignore
    app!.post(`/telegraf/${_brklyn.secretPathComponent()}`, webhook)

    app!.get('/status', async (req, res) => {
      const stat = await _brklyn.isBotHealthy()

      // 4xx for false, 200 for true
      res.status(stat ? 200 : 404).send()
    })

    app!.listen({ port: process.env.PORT ? parseInt(process.env.PORT) : 80, host: '0.0.0.0' })
      .then(() => info('networking', `webhook started @ ${process.env.PORT || 80}`))
  }
}
