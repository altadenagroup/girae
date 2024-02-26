import { Client, info, plugins } from 'melchior'
import { PrismaClient } from '@prisma/client'
import { RedisClientType } from 'redis'
import { Redis } from '@telegraf/session/redis'
import userData from './middleware/user-data.js'
import * as luckyEngine from './utilities/lucky-engine.js'
import { DittoMetadata } from './types/ditto.js'
import argumentParser from './middleware/argument-parser.js'

export default class Brooklyn extends Client {
    db: PrismaClient
    #internalCache: RedisClientType = {} as RedisClientType
    cache: BrooklynCacheLayer = {} as BrooklynCacheLayer
    engine = luckyEngine

    constructor (cache: RedisClientType) {
        super(process.env.TELEGRAM_TOKEN!, {
            plugins: [
                new plugins.CommandLoaderPlugin({
                    commandDirectory: './src/commands',
                    guardDirectory: './src/guards',
                    sceneDirectory: './src/scenes'
                })
            ],
            errorThreshold: 5,
            sessionStore: Redis({ client: cache })
        })

        this.#internalCache = cache
        this.cache = new BrooklynCacheLayer(cache)
        this.db = new PrismaClient()
        this.setUpExitHandler()
        this.use(argumentParser)
        this.use(userData)
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
        }).then(t => t.json())
        return res
    }

    async getDittoMetadata (): Promise<DittoMetadata> {
        return fetch(`${process.env.INTERNAL_DITTO_URL}/metadata`).then(t => t.json())
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
        return this.#cache.set(`${namespace}:${key}`, JSON.stringify(value), {
            EX: seconds
        })
    }

    async del (namespace: string, key: string) {
        return this.#cache.del(`${namespace}:${key}`)
    }
}
