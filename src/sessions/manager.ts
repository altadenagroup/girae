import { BotContext } from '../types/context.js'
import type Brooklyn from '../Brooklyn.js'
import { User } from 'telegraf/types'
import { AdvancedScene, SceneController } from './scene.js'
import startTrade from '../scenes/start-trade.js'
import { generateID } from '../utilities/misc.js'
import { debug, warning } from 'melchior'
import { SessionContext } from './context.js'
import drawCard from '../scenes/draw-card.js'
import deleteCard from '../scenes/delete-card.js'
import { ExtendedBotContext, tcqc } from './tcqc.js'

export interface ES2Methods {
  enter (sceneID: string, args?: { [key: string]: any } | undefined): Promise<void>
}

interface SessionData {
  scene: string
  currentStep: number
  es2Enabled: true
  data?: { [key: string]: any }
}

export class SessionManager {
  scenes: AdvancedScene<any>[] = []
  constructor (private bot: Brooklyn) {
    this.scenes.push(startTrade)
    this.scenes.push(drawCard)
    this.scenes.push(deleteCard)
  }

  async middleware (ctx: BotContext, next: () => void) {
    if (!ctx.from) {
      return next()
    }

    // @ts-ignore
    if (ctx.callbackQuery?.data?.startsWith?.('ES2.')) {
      // @ts-ignore
      debug('es²', `received callback query: ${ctx.callbackQuery.data}`)
      if (await tcqc.handle(ctx as ExtendedBotContext<any>)) {
        return
      }
    }

    this.addES2Methods(ctx)

    const key = this.generateUserKey(ctx)
    const sessionKey = await this.bot.cache.get('es2_user_keys', key)
    if (!sessionKey) return next()

    const session = await this.bot.cache.get('es2_sessions', sessionKey)
    if (!session || !session.es2Enabled) return next()
    const checks = await this.checkAttributes(ctx as SessionContext<any>, session.data)
    if (!checks) return next()

    // resume scene
    const scene = this.scenes.find(s => s.id === session.scene)
    if (!scene) {
      warning('es²', `tried to resume scene ${session.scene} but it was not found`)
      return next()
    }
    const allowedUpdates = scene.allowedEvents
    if (allowedUpdates && allowedUpdates.length > 0 && !allowedUpdates.includes(ctx.updateType)) {
      return next()
    }

    // check if this session (with the given user and chat) is already running to avoid double answering
    const isRunning = await this.bot.cache.get('es2_running_sessions', `${key}${sessionKey}`)
    if (isRunning) {
      return
    }
    await this.bot.cache.set('es2_running_sessions', `${key}${sessionKey}`, true)

    this.handleSession(ctx as SessionContext<any>, session, scene, sessionKey).then(async () => {
      await this.bot.cache.del('es2_running_sessions', `${key}${sessionKey}`)
    })
  }

  async checkAttributes (ctx: SessionContext<any>, data: { [key: string]: any }) {
    // @ts-ignore
    if (data?._prohibitMultipleCommands && ctx.message?.text?.startsWith?.('/')) {
      return false
    }

    return true
  }

  async handleSession (ctx: SessionContext<any>, session: SessionData, scene: AdvancedScene<any>, sessionKey: string, args: { [key: string]: any } | undefined = undefined) {
    const sceneController = new SceneController()

    ctx.session = {
        data: session.data || {},
        key: sessionKey,
        manager: this,
        steps: sceneController,
        arguments: args,
        attachUserToSession: (user: User) => this.attachUser(sessionKey, ctx, user),
        setMainMessage: (messageId: number) => {
          ctx.session.data._mainMessage = messageId
        },
        setMessageToBeQuoted: (messageId) => {
          ctx.session.data._messageToBeQuoted = messageId
        },
        deleteMainMessage: () => {
          return this.bot.telegram.deleteMessage(ctx.chat!.id, ctx.session.data._mainMessage).catch((e) => {
            warning('es²', `(${sessionKey}) failed to delete main message: ${e.message}`)
          })
        },
        setAttribute: (key, value) => {
          ctx.session.data[`_${key}`] = value
        }
      }

    this.applyCtxMutations(ctx)

    const status = await scene.run(ctx, session.currentStep)

    if (status.nextStep !== undefined) {
      session.currentStep = status.nextStep
      await this.bot.cache.set('es2_sessions', sessionKey, {
        ...session,
        data: ctx.session.data
      })
    } else {
      await this.deleteSession(sessionKey)
    }
  }

  applyCtxMutations (ctx: SessionContext<any>) {
    ctx.reply = async (text: string, extra: any) => {
      if (ctx.session.data._messageToBeQuoted) {
        return ctx.telegram.sendMessage(ctx.chat!.id, text, {
          ...extra,
          reply_to_message_id: ctx.session.data._messageToBeQuoted
        })
      }
      return ctx.telegram.sendMessage(ctx.chat!.id, text, extra)
    }
  }

  generateUserKey (ctx: BotContext, user: User | undefined = undefined) {
    const u = user || ctx.from!
    return `${u.id}:${ctx.chat!.id}`
  }

  addES2Methods (ctx: BotContext) {
    ctx.es2 = {
      enter: (id, args) => {
        return this.enterScene(ctx, id, args)
      }
    }
  }

  async createSession (ctx: BotContext, initialData: SessionData) {
    const key = this.generateUserKey(ctx)
    const sessionKey = generateID(12)
    await this.bot.cache.set('es2_user_keys', key, sessionKey)
    await this.bot.cache.set('es2_sessions', sessionKey, initialData)
    await this.bot.cache.set('es2_attached_users', sessionKey, [key])

    return {
      userKey: key,
      sessionID: sessionKey
    }
  }

  async attachUser (sessionID: string, ctx: BotContext, user: User) {
    const session = await this.bot.cache.get('es2_sessions', sessionID)
    if (!session) {
      throw new Error(`Session with ID ${sessionID} not found`)
    }
    const key = this.generateUserKey(ctx, user)
    await this.bot.cache.set('es2_user_keys', key, sessionID)
    const attachedKeysToSession = await this.bot.cache.get('es2_attached_users', sessionID)
    await this.bot.cache.set('es2_attached_users', sessionID, [...attachedKeysToSession, key])
  }

  async deleteSessionWithUser (chatID: number, user: User) {
    // @ts-ignore
    const key = this.generateUserKey({ chat: { id: chatID, type: 'channel', title: '.' }, from: user })
    const sessionID = await this.bot.cache.get('es2_user_keys', key)
    if (sessionID) {
      await this.deleteSession(sessionID)
    }
  }

  async deleteSession (sessionID: string) {
    const attachedKeys = await this.bot.cache.get('es2_attached_users', sessionID)
    if (attachedKeys) {
      for (const key of attachedKeys) {
        await this.bot.cache.del('es2_user_keys', key)
      }
    }
    await this.bot.cache.del('es2_sessions', sessionID)
    await this.bot.cache.del('es2_attached_users', sessionID)
    debug('es²', `deleted session ${sessionID}`)
  }

  async updateDataForSession (sessionID: string, data: SessionData['data']) {
    const session = await this.bot.cache.get('es2_sessions', sessionID)
    if (!session) {
      throw new Error(`Session with ID ${sessionID} not found`)
    }
    session.data = data
    await this.bot.cache.set('es2_sessions', sessionID, session)
  }

  async enterScene (ctx: BotContext, sceneID: string, args: { [key: string]: any } | undefined = undefined) {
    const scene = this.scenes.find(s => s.id === sceneID)
    if (!scene) {
      throw new Error(`Scene with ID ${sceneID} not found`)
    }

    const { sessionID } = await this.createSession(ctx, {
      scene: sceneID,
      currentStep: 0,
      es2Enabled: true
    })

    const session = await this.bot.cache.get('es2_sessions', sessionID)
    if (!session) {
      throw new Error(`Session with ID ${sessionID} not found`)
    }

    await this.handleSession(ctx as SessionContext<any>, session, scene, sessionID, args)
  }
}
