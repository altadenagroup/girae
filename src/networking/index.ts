import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { info } from 'melchior'
import { fastify } from 'fastify'
import * as Sentry from '@sentry/node'
import { stripeWebhook } from './webhooks.js'

const app = process.env.MAIN_CONTAINER ? null : fastify()
await app?.register?.(import('fastify-raw-body'), {
  field: 'rawBody', // change the default request.rawBody property name
  global: true, // add the rawBody to every request. **Default true**
  encoding: 'utf8', // set it to false to set rawBody as a Buffer **Default utf8**
  runFirst: true, // get the body before any preParsing hook change/uncompress it. **Default false**
  routes: [], // array of routes, **`global`** will be ignored, wildcard routes not supported
  jsonContentTypes: [], // array of content-types to handle as JSON. **Default ['application/json']**
})

export const bootstrapGQLServer = async () => {
  const { schema } = await import('./graphql.js')

  const server = new ApolloServer({ schema })
  return startStandaloneServer(server, {
    listen: { port: process.env.PORT ? parseInt(process.env.PORT) : 6788 },
    context: async () => ({ prisma: _brklyn.db })
  }).then((d) => {
    info('graphql', `server started @ ${d.url}`)
  })
}

export const bootstrap = async () => {
  if (process.env.MAIN_CONTAINER || process.env.RUN_GQL) {
    await bootstrapGQLServer()
  } else {
    info('networking', 'starting webhook server')
    const webhook = _brklyn.webhookCallback(`/telegraf/${process.env.WEBHOOK_PATH || _brklyn.secretPathComponent()}`, {
      secretToken: undefined
    })

    // @ts-ignore
    app!.post(`/telegraf/${process.env.WEBHOOK_PATH || _brklyn.secretPathComponent()}`, async (req, res) => {
      try {
        // @ts-ignore
        const t = await webhook(req, res)
      } catch (e) {
        Sentry.setTags({ type: 'webhook' })
        Sentry.captureException(e)
      }
      res.status(200).send()
    })

    app!.post('/webhooks/stripe', stripeWebhook)

    app!.get('/status', async (_, res) => {
      const stat = await _brklyn.isBotHealthy()

      // 4xx for false, 200 for true
      res.status(stat ? 200 : 404).send()
    })

    app!.listen({ port: process.env.PORT ? parseInt(process.env.PORT) : 80, host: '0.0.0.0' })
      .then(() => info('networking', `webhook started @ ${process.env.PORT || 80}`))
  }
}
