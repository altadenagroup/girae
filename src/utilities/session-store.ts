import { User } from 'telegraf/types'
import { generateID } from './misc.js'
import { Context } from 'telegraf'

export const AdvancedRedisStore = () => {
  return {
    async get (key: string) {
      const sessionKey = await _brklyn.cache.get('user_to_session', key)
      if (!sessionKey) {
        // try to find the session in attached_sessions
        const attachedSessions = await _brklyn.cache.get('attached_sessions', key)
        if (!attachedSessions) return undefined
        const sessionID = await _brklyn.cache.get('user_to_session', attachedSessions)
        if (!sessionID) return undefined
        return JSON.parse(await _brklyn.cache.get('session', sessionID))
      }
      const session = await _brklyn.cache.get('session', sessionKey)
      if (!session) return undefined
      return JSON.parse(session)
    },
    async set (key: string, value: any) {
      if (!value.__scenes) return

      const sessionID = generateID(6)
      await _brklyn.cache.set('user_to_session', key, sessionID)
      return await _brklyn.cache.set('session', sessionID, JSON.stringify(value))
    },
    async delete (key: string) {
      const sessionKey = await _brklyn.cache.get('user_to_session', key)
      await _brklyn.cache.del('user_to_session', key)
      const sessions = await _brklyn.cache.get('attached_sessions_data', key)
      if (sessions) {
        for (const session of sessions) {
          await _brklyn.cache.del('attached_sessions', session)
        }
        await _brklyn.cache.del('attached_sessions_data', key)
      }
      return await _brklyn.cache.del('session', sessionKey)
    }
  }
}

export const addUserToSession = async (ctx: Context, user: User) => {
  const userKey = `${user.id}:${ctx.chat!.id}`
  const authorKey = `${ctx.from!.id}:${ctx.chat!.id}`
  await _brklyn.cache.set('attached_sessions', userKey, authorKey)
  const connectedSessions = await _brklyn.cache.get('attached_sessions_data', authorKey) || []
  connectedSessions.push(userKey)
  await _brklyn.cache.set('attached_sessions_data', authorKey, connectedSessions)
}
