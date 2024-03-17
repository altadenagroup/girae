// Project Brooklyn
// the altadena group, 2024
import 'dotenv/config'
import './utilities/prototypes.js'
import { createClient, RedisClientType } from 'redis'
import 'reflect-metadata'
import Brooklyn from './Brooklyn.js'

const client = createClient({ url: process.env.REDIS_URL })
client.on('error', (err) => {
    console.error('An error occurred:', err)
    if (err.message.includes('ECONNREFUSED')) {
        console.error('The connection was refused. Is the server running?')
        process.exit(1)
    }
})
await client.connect()

const brooklyn = new Brooklyn(client as RedisClientType)
global._brklyn = brooklyn

await brooklyn.prelaunch()
await brooklyn.launch()


