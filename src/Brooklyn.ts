import { Client, info, plugins } from 'melchior'
import { PrismaClient } from '@prisma/client'
import { RedisClientType } from 'redis'
import userData from './middleware/user-data.js'
import { DittoMetadata } from './types/ditto.js'
import argumentParser from './middleware/argument-parser.js'
import { OpenAI } from 'openai'
import cloudinary from 'cloudinary'
import { AdvancedRedisStore } from './utilities/session-store.js'
import { Context, session } from 'telegraf'
import { functionEditing } from './middleware/function-editing.js'
import { Sidecar } from './sidecar/index.js'
import { SessionManager } from './sessions/manager.js'
import userCooldown from './middleware/user-cooldown.js'
import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { bootstrap } from './networking/index.js'

export const prebuiltPath = (c: string) => `./dist${c.replace('.', '')}`

const middlewareSafety = (fun) => {
  return (...args) => {
    try {
      const data = await fun(...args)
      return data
    } catch (e: any) {
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
  #internalCache: RedisClientType = {} as RedisClientType

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
    })

    this.#internalCache = cache
    this.cache = new BrooklynCacheLayer(cache)
    this.db = new PrismaClient()
    this.es2 = new SessionManager(this)
    this.use(middlewareSafety(userCooldown))
    this.use(middlewareSafety(functionEditing))
    this.use(middlewareSafety(argumentParser))
    this.use(middlewareSafety(userData))

    // @ts-ignore
    this.use((...args) => this.es2.middleware(...args))
    this.use(session({
      store: AdvancedRedisStore()
    }))

    this.setUpCDN()
    this.setUpExitHandler()
    this.setUpSentry()
    this.setUpMainContainerTasks()
  }

  async generateImage (templateKey: string, data: Record<string, any>) {
    // request to ditto
    const res = await fetch(`${process.env.INTERNAL_DITTO_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.DITTO_API_KEY!
      },
      body: JSON.stringify({
        theme: templateKey,
        story: false,
        hide_username: false,
        data
      })
    }).then(t => t.json()).catch(e => {
      info('ditto.generateImage', `got an error: ${e}`)
      return null
    })

    return res
  }

  async getDittoMetadata (): Promise<DittoMetadata> {
    return fetch(`${process.env.INTERNAL_DITTO_URL}/metadata`).then(t => t.json())
  }

  healthCheck(): Promise<boolean> {
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
    await this.sidecar.cleanUpTasks()
  }

  setUpSentry () {
    if (!process.env.SENTRY_DSN) return

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        nodeProfilingIntegration(),
        new Sentry.Integrations.Prisma({ client: this.db }),
        Sentry.anrIntegration({ captureStackTrace: true })
      ],
      tracesSampleRate: 0.5,
      profilesSampleRate: 1.0,
      _experiments: {
        metricsAggregator: true
      }
    })
  }

  private setUpMainContainerTasks () {
    if (process.env.SENTRY_DSN && !process.env.MAIN_CONTAINER) return
    info('bot', 'considering this instance as the main container')
    this.sidecar.scheduleAll()
  }

  setUpNetworkingFeatures () {
    bootstrap()
  }

  private setUpCDN () {
    if (!process.env.CLOUDINARY_CLOUD_NAME) return

    cloudinary.v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })
  }

  private onExit (code: number) {
    info('bot', `Exiting with code ${code}`)
    this.db.$disconnect()
    this.#internalCache.quit()
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
    if (process.env.NO_CACHING) return this.#cache.set(`${namespace}:${key}`, JSON.stringify(value), { EX: 5 })

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
}
