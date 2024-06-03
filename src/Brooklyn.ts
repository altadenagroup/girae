import { Client, error, info, plugins } from 'melchior'
import { PrismaClient } from '@prisma/client'
import { RedisClientType } from 'redis'
import userData from './middleware/user-data.js'
import { DittoMetadata } from './types/ditto.js'
import argumentParser from './middleware/argument-parser.js'
import { OpenAI } from 'openai'
import { AdvancedRedisStore } from './utilities/session-store.js'
import { Context, session } from 'telegraf'
import { functionEditing } from './middleware/function-editing.js'
import { Sidecar } from './sidecar/index.js'
import { SessionManager } from './sessions/manager.js'
import * as Sentry from '@sentry/node'
import { bootstrap } from './networking/index.js'
import { S3Storage } from './storage/index.js'
import { Ditto } from './ditto/index.js'
import { populateDatabase } from './development/index.js'
import PaymentSystem from './payments/index.js'
import { LastFMController } from './fm/index.js'

const { nodeProfilingIntegration } = process.versions.bun ? { nodeProfilingIntegration: null } : await import('@sentry/profiling-node')

export const prebuiltPath = (c: string) => process.versions.bun ? c : `./dist${c.replace('.', '')}`

const middlewareSafety = (fun) => {
  return async (...args) => {
    try {
      return await fun(...args)
    } catch (e: any) {
      error('middleware', `an exception was thrown in a middleware. THIS IS UNACCEPTABLE!\n${e.stack}`)
      Sentry.setTag('wasMiddleware', 'true')
      Sentry.captureException(e)
    }
  }
}

export default class Brooklyn extends Client {
  db: PrismaClient
  cache: BrooklynCacheLayer = {} as BrooklynCacheLayer
  ai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || ''
  })
  sidecar = new Sidecar()
  es2: SessionManager
  images = new S3Storage('girae-images')
  ditto = new Ditto()
  internalCache: RedisClientType = {} as RedisClientType
  payments = new PaymentSystem()
  fm = new LastFMController()

  constructor (cache: RedisClientType) {
    super(process.env.TELEGRAM_TOKEN!, {
      plugins: [
        new plugins.CommandLoaderPlugin({
          commandDirectory: prebuiltPath('./src/commands'),
          guardDirectory: prebuiltPath('./src/guards'),
          sceneDirectory: prebuiltPath('./src/legacy-scenes')
        })
      ],
      errorThreshold: 5,
      useSessions: false,
      middlewares: []
    }, {
      telegram: {
        apiRoot: 'https://tg.altadena.space/'
      }
    })

    this.internalCache = cache
    this.cache = new BrooklynCacheLayer(cache)
    this.db = new PrismaClient()
    this.es2 = new SessionManager(this)

    populateDatabase(this.db).then(() => true)
    this.use(middlewareSafety(functionEditing))
    this.use(middlewareSafety(argumentParser))
    this.use(middlewareSafety(userData))

    // @ts-ignore
    this.use((...args) => this.es2.middleware(...args))
    this.use(session({
      store: AdvancedRedisStore()
    }))

    this.setUpExitHandler()
    this.setUpSentry()
    this.setUpMainContainerTasks()
  }

  async generateImage (templateKey: string, data: Record<string, any>, addData: any = {}) {
    // if there's no INTERNAL_DITTO_URL, we can't generate images
    if (!process.env.INTERNAL_DITTO_URL) return null

    // request to ditto
    return await fetch(`${process.env.INTERNAL_DITTO_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.DITTO_API_KEY!
      },
      body: JSON.stringify({
        theme: templateKey,
        story: false,
        hide_username: false,
        ...addData,
        data,
        is_evil_mode: process.env.JANET_VERSION ? true : false
      })
    }).then(t => t.json()).catch(e => {
      info('ditto.generateImage', `got an error: ${e}`)
      return null
    })
  }

  async getDittoMetadata (): Promise<DittoMetadata | null> {
    if (!process.env.INTERNAL_DITTO_URL) return null

    return fetch(`${process.env.INTERNAL_DITTO_URL}/metadata`).then(t => t.json())
  }

  healthCheck (): Promise<boolean> {
    // check if we can set and get from cache and database
    return Promise.all([
      this.cache.set('health', 'check', 'ok'),
      this.cache.get('health', 'check'),
      this.db.user.findFirst({ take: 1 })
    ]).then(() => true).catch(() => false)
  }

  getSessionKey (ctx: Context): string | undefined {
    const fromId = ctx.from?.id
    const chatId = ctx.chat?.id
    if (fromId == null || chatId == null) return undefined

    if (ctx.message?.message_thread_id) return `${fromId}:${chatId}:${ctx.message.message_thread_id}`
    return `${fromId}:${chatId}`
  }

  async prelaunch () {

  }

  setUpSentry () {
    if (!process.env.SENTRY_DSN) return

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        // @ts-ignore
        nodeProfilingIntegration(),
        new Sentry.Integrations.Prisma({ client: this.db }),
        Sentry.anrIntegration({ captureStackTrace: true })
      ],
      tracesSampleRate: 0.2,
      profilesSampleRate: 1.0,
      _experiments: {
        metricsAggregator: true
      }
    })
  }

  setUpNetworkingFeatures () {
    bootstrap()
  }

  private setUpMainContainerTasks () {
    if (!process.env.MAIN_CONTAINER) return

    info('bot', 'considering this instance as the main container')
    this.sidecar.scheduleAll()
  }

  private onExit (code: number) {
    info('bot', `Exiting with code ${code}`)
    this.db.$disconnect()
    this.internalCache.quit()
    process.exit(code)
  }

  private setUpExitHandler () {
    process.on('SIGINT', () => this.onExit(0))
    process.on('SIGTERM', () => this.onExit(0))
  }
}

export class BrooklynCacheLayer {
  #cache: RedisClientType

  constructor (cache: RedisClientType) {
    this.#cache = cache
  }

  async get (namespace: string, key: string) {
    const value = await this.#cache.get(`${namespace}:${key}`)
    return value ? JSON.parse(value) : null
  }

  async set (namespace: string, key: string, value: any) {
    return this.#cache.set(`${namespace}:${key}`, JSON.stringify(value))
  }

  async setexp (namespace: string, key: string, value: any, seconds: number) {
    if (process.env.NO_CACHING && !namespace.startsWith('es2')) return this.#cache.set(`${namespace}:${key}`, JSON.stringify(value), { EX: 5 })

    return this.#cache.set(`${namespace}:${key}`, JSON.stringify(value), {
      EX: seconds
    })
  }

  async del (namespace: string, key: string) {
    return this.#cache.del(`${namespace}:${key}`)
  }

  async keys (namespace: string, pattern: string) {
    const keys = await this.#cache.keys(`${namespace}:${pattern}`)
    return keys.map(k => k.replace(`${namespace}:`, ''))
  }

  async has (namespace: string, key: string) {
    return this.#cache.exists(`${namespace}:${key}`)
  }

  async flushall () {
    return this.#cache.flushAll()
  }

  async incr (namespace: string, key: string) {
    return this.#cache.incr(`${namespace}:${key}`)
  }

  async decr (namespace: string, key: string) {
    return this.#cache.decr(`${namespace}:${key}`)
  }

  // deletes all keys in a namespace
  async clearNamespace (namespace: string) {
    const keys = await this.keys(namespace, '*')
    return Promise.all(keys.map(k => this.del(namespace, k)))
  }
}
