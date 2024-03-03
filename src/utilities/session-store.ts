import { User } from 'telegraf/types'
import { BotContext } from '../types/context.js'
import { generateID } from './misc.js'

export const AdvancedRedisStore = () => {
  return {
    async get (key: string) {
      const sessionKey = await _brklyn.cache.get('user_to_session', key)
      if (!sessionKey) return undefined
      const session = await _brklyn.cache.get('session', sessionKey)
      if (!session) return undefined
      return JSON.parse(session)
    },
    async set (key: string, value: any) {
      const sessionID = generateID(6)
      await _brklyn.cache.set('user_to_session', key, sessionID)
      return await _brklyn.cache.set('session', sessionID, JSON.stringify(value))
    },
    async delete (key: string) {
      const sessionKey = await _brklyn.cache.get('user_to_session', key)
      if (!sessionKey) return undefined
      // get all user_to_session with the session key
      const users = await _brklyn.cache.keys('user_to_session', `${key}*`)
      for (const user of users) {
        await _brklyn.cache.del('user_to_session', user)
      }
      return await _brklyn.cache.del('session', sessionKey)
    }
  }
}

export const addUserToSession = async (ctx: BotContext, user: User) => {
  const userKey = `${user.id}:${ctx.chat!.id}`
  const authorKey = `${ctx.from!.id}${ctx.chat!.id}`
  const sessionKey = await _brklyn.cache.get('user_to_session', authorKey)
  if (sessionKey) {
    _brklyn.cache.set('user_to_session', userKey, sessionKey)
  }
}
