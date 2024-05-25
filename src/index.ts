// Project Brooklyn
// the altadena group, 2024
import 'dotenv/config'
import './utilities/prototypes.js'
import { createClient, RedisClientType } from 'redis'
import 'reflect-metadata'
import { info } from 'melchior'
import { checkIfIsFirstBoot } from './development/index.js'

checkIfIsFirstBoot()

console.log('-'.repeat(50))
console.log('Project Brooklyn is now booting')
console.log('All rights reserved to The Altadena Group, 2024')
console.log('-'.repeat(50))

import Brooklyn from './Brooklyn.js'

process.env.BOT_NAME = process.env.BOT_NAME || 'Giraê'
if (process.env.RUN_BETA) {
  info('giraê', 'running in beta mode')
  process.env.OG_TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
  process.env.TELEGRAM_TOKEN = process.env.BETA_TELEGRAM_TOKEN
  process.env.LAUNCH_POLLING = 'true'
}

const client = createClient({ url: process.env.REDIS_URL })
client.on('error', (err) => {
  console.error('An error occurred:', err)
  if (err.message.includes('ECONNREFUSED')) {
    console.error('The connection was refused. Is the server running?')
    process.exit(1)
  }
})
await client.connect()

global._brklyn = new Brooklyn(client as RedisClientType)
if ((!process.env.MAIN_CONTAINER && !process.env.LAUNCH_POLLING) || process.env.COLD_RUN) _brklyn.launchPlugins().then(() => {
  if (process.env.COLD_RUN) {
    info('giraê', 'cold run ok')
    process.exit(0)
  }
})

if (process.env.LAUNCH_POLLING) {
  process.env.RUN_GQL = undefined
  await _brklyn.launch(undefined, () => {
    _brklyn.setUpNetworkingFeatures()
    info('giraê', `logged in as @${_brklyn.botInfo!.username}`)
  })
} else {
  _brklyn.setUpNetworkingFeatures()
}


