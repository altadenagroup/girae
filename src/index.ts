// Project Brooklyn
// the altadena group, 2024
import 'dotenv/config'
import './utilities/prototypes.js'
import { createClient, RedisClientType } from 'redis'
import 'reflect-metadata'
import { info } from 'melchior'

if (process.env.RUN_BETA) {
  info('giraê', 'running in beta mode')
  process.env.TELEGRAM_TOKEN = process.env.BETA_TELEGRAM_TOKEN
  process.env.LAUNCH_POLLING = 'true'
}

import Brooklyn from './Brooklyn.js'


const client = createClient({url: process.env.REDIS_URL})
client.on('error', (err) => {
  console.error('An error occurred:', err)
  if (err.message.includes('ECONNREFUSED')) {
    console.error('The connection was refused. Is the server running?')
    process.exit(1)
  }
})
await client.connect()

global._brklyn = new Brooklyn(client as RedisClientType)
if (!process.env.MAIN_CONTAINER && !process.env.LAUNCH_POLLING) _brklyn.launchPlugins()

if (process.env.LAUNCH_POLLING) {
  await _brklyn.launch()
} else {
  _brklyn.setUpNetworkingFeatures()
}


