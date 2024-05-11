import { BotContext } from '../types/context.js'
import type Brooklyn from '../Brooklyn.js'
import { InlineKeyboardButton, User } from 'telegraf/types'
import { AdvancedScene, CurrentSceneStatus, SceneController } from './scene.js'
import startTrade from '../scenes/start-trade.js'
import { generateID } from '../utilities/misc.js'
import { debug, error, warn } from 'melchior'
import { SessionContext } from './context.js'
import drawCard from '../scenes/draw-card.js'
import showCollection from '../scenes/col.js'
import deleteCard from '../scenes/delete-card.js'
import addItem from '../scenes/add-item.js'
import { ExtendedBotContext, tcqc } from './tcqc.js'
import { TelegramError } from 'telegraf'
import * as Sentry from '@sentry/node'
import showCategory from '../scenes/ctg.js'
import showCards from '../scenes/crds.js'

export interface ES2Methods {
  enter (sceneID: string, args?: { [key: string]: any } | undefined): Promise<void>
}

interface SessionData {
  scene: string
  currentStep: number
  es2Enabled: true
  sessionKey: string
  data?: { [key: string]: any }
}

export class SessionManager {
  scenes: AdvancedScene<any>[] = []

  constructor (private bot: Brooklyn) {
    this.scenes.push(startTrade)
    this.scenes.push(drawCard)
    this.scenes.push(deleteCard)
    this.scenes.push(addItem)
    // @ts-ignore
    this.scenes.push(showCollection)
    // @ts-ignore
    this.scenes.push(showCategory)
    // @ts-ignore
    this.scenes.push(showCards)
  }

  get cancelButtonArray (): InlineKeyboardButton[] {
    return [{ text: '❌ Cancelar', callback_data: tcqc.generateCallbackQuery('es2-end-session', 'CANCEL') }]
  }

  safeCancelButtonArray (userID: string): InlineKeyboardButton[] {
    return [{ text: '❌ Cancelar', callback_data: tcqc.generateCallbackQuery('es2-end-session', 'CANCEL.'+ userID) }]
  }

  async middleware (ctx: BotContext, next: () => void) {
    if (!ctx.from || ctx.chatBoost) {
      return next()
    }

    // @ts-ignore
    if (ctx.callbackQuery?.data?.startsWith?.('ES2.')) {
      // @ts-ignore
      if (ctx.callbackQuery.data!.startsWith('ES2.es2-end-session')) {
        return this.cancelSession(ctx)
      }
      // @ts-ignore
      debug('es²', `received callback query: ${ctx.callbackQuery.data}`)
      if (await tcqc.handle(ctx as ExtendedBotContext<any>)) {
        return
      }

      // @ts-ignore
    } else if (ctx.callbackQuery?.data?.endsWith?.('ADD_CARD')) {
      return next()
    }

    this.addES2Methods(ctx)

    // if this update contains a callback query starting with ES2D, it means the session key is included in the payload, so we can just resume the session
    // @ts-ignore
    if (ctx.callbackQuery?.data?.startsWith?.('ES2D.')) {
      // @ts-ignore
      const sessionKey = ctx.callbackQuery.data.split('.').slice(1)[0]
      const session = await this.bot.cache.get('es2_sessions', sessionKey)
      if (!session) {
        await ctx.answerCbQuery('1 - Esse comando é velho e não pode mais ser usado. Use o comando novamente.').catch(() => {
        })
        return next()
      }
      // get attached users. if the sender isn't one of them, return
      if (session.sessionID !== this.generateUserKey(ctx)) {
        await ctx.answerCbQuery('2 - Esse comando é velho e não pode mais ser usado. Use o comando novamente.').catch(() => {
        })
        return next()
      }

      const scene = this.scenes.find(s => s.id === session.scene)
      if (!scene) {
        warn('es²', `tried to resume scene ${session.scene} but it was not found`)
        await ctx.answerCbQuery('3 - Esse comando é velho e não pode mais ser usado. Use o comando novamente.').catch(() => {
        })
        return next()
      }
      const allowedUpdates = scene.allowedEvents
      if (allowedUpdates && allowedUpdates.length > 0 && !allowedUpdates.includes(ctx.updateType)) {
        return next()
      }

      const userKey = this.generateUserKey(ctx)
      await this.handleSession(ctx as SessionContext<any>, session, scene, userKey).catch((e) => {
        error('es²', `error while resuming session: ${e.stack}`)
      })
      return
    }

    const key = this.generateUserKey(ctx)
    const sessionKey = await this.bot.cache.get('es2_user_keys', key)
    if (!sessionKey) return next()

    // if this is a message and it contains the text /cancel, delete the session but keep running
    // @ts-ignore
    if (ctx.message?.text?.startsWith?.('/cancel')) {
      await this.deleteSession(sessionKey)
    }

    const session = await this.bot.cache.get('es2_sessions', sessionKey)
    if (!session || !session.es2Enabled) return next()


    const checks = await this.checkAttributes(ctx as SessionContext<any>, session.data)
    if (!checks) return next()

    // resume scene
    const scene = this.scenes.find(s => s.id === session.scene)
    if (!scene) {
      warn('es²', `tried to resume scene ${session.scene} but it was not found`)
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
    return !(data?._prohibitMultipleCommands && ctx.message?.text?.startsWith?.('/'))
  }

  async handleSession (ctx: SessionContext<any>, session: SessionData, scene: AdvancedScene<any>, userKey: string, args: {
    [key: string]: any
  } | undefined = undefined) {
    const sceneController = new SceneController()

    ctx.session = {
      data: session.data || {},
      key: userKey,
      manager: this,
      steps: sceneController,
      arguments: args,
      attachUserToSession: (user: User) => this.attachUser(session.sessionKey, ctx, user),
      setMainMessage: (messageId: number) => {
        ctx.session.data._mainMessage = messageId
      },
      setMessageToBeQuoted: (messageId) => {
        ctx.session.data._messageToBeQuoted = messageId
      },
      deleteMainMessage: () => {
        return this.bot.telegram.deleteMessage(ctx.chat!.id, ctx.session.data._mainMessage).catch((e) => {
          warn('es²', `(${userKey}) failed to delete main message: ${e.message}`)
        })
      },
      editMainMessageText: (text, extra) => {
        return this.bot.telegram.editMessageText(ctx.chat!.id, ctx.session.data._mainMessage, undefined, text, extra)
      },
      editMainMessageCaption: (caption, extra) => {
        return this.bot.telegram.editMessageCaption(ctx.chat!.id, ctx.session.data._mainMessage, undefined, caption, extra)
      },
      setAttribute: (key, value) => {
        ctx.session.data[`_${key}`] = value
      },
      deleteSession: async () => {
        await _brklyn.cache.del('es2_user_keys', userKey)
        return this.deleteSession(session.sessionKey)
      },
      nextStepData: (data) => {
        return `ES2S.${session.scene}.${(session.currentStep || 0) + 1}.${data}`
      },
      generateSessionQuery: (data) => {
        return `ES2D.${session.sessionKey}.${data}`
      },
      getDataFromSessionQuery: (parseFn = undefined) => {
        // @ts-ignore
        const data = ctx.callbackQuery?.data
        if (!data) return
        // @ts-ignore
        const d = data.split('.').slice(2).join('.')
        return parseFn ? parseFn(d) : d as any
      },
      getCurrentStepData: (parseFn = undefined) => {
        // @ts-ignore
        const data = ctx.callbackQuery?.data
        if (!data) return
        // @ts-ignore
        const d = data.split('.').slice(3).join('.')
        return parseFn ? parseFn(d) : d as any
      }
    }

    this.applyCtxMutations(ctx)

    const status = await this.runScene(ctx, session, scene)
    if (!status) return

    if (status.endSession) {
      await this.deleteSession(session.sessionKey)
      return
    }

    if (status?.nextStep !== undefined) {
      session.currentStep = status.nextStep
      await this.bot.cache.setexp('es2_sessions', session.sessionKey, {
        ...session,
        data: ctx.session.data,
        currentStep: status.nextStep
      }, 60 * 60 * 24)
    } else {
      await this.deleteSession(session.sessionKey)
    }
  }

  runScene (ctx: SessionContext<any>, session: SessionData, scene: AdvancedScene<any>): Promise<CurrentSceneStatus | undefined> {
    const ogSession = session
    Sentry.metrics.increment('es2-runs', 1, { tags: { scene: scene.id } })
    return Sentry.startSpan({
      op: 'es2.runScene',
      name: `running scene ${scene.id} (step ${session.currentStep})`
    }, async (span) => {
      Sentry.setContext('es2', { scene: scene.id, step: session.currentStep, user: ctx.from, chat: ctx.chat })
      // @ts-ignore
      return scene.run(ctx, session.currentStep).catch((e: TelegramError) => {
        if (e.message.includes('Too Many Requests') && ctx.session.data._replayOnRateLimit) {
          debug('es²', `got a 429, retrying in speficied time / 2`)
          // @ts-ignore
          span?.setAttribute('retry_after', e.response.retry_after)
          return new Promise<CurrentSceneStatus | undefined>((resolve) => {
            setTimeout(() => {
              resolve(this.runScene(ctx, ogSession, scene) as any)
              // @ts-ignore
            }, e.response.retry_after * 500)
          })
        }
        error('es²', `error while running scene: ${e.stack}`)
        Sentry.captureException(e)
        return { endSession: true }
      })
    })
  }

  // deletes the session and the main messsage associated with it. also sends a reply saing the command was cancelled.
  async cancelSession (ctx: BotContext) {
    if (!ctx.from || !ctx.chat) {
      return
    }

    if (ctx.callbackQuery) {
      await ctx.deleteMessage().catch(() => {
      })
    }
    await _brklyn.cache.del('is_drawing', ctx.from?.id.toString())

    // @ts-ignore
    if (ctx.callbackQuery?.data) await ctx.answerCbQuery('🚪 Comando cancelado.')
    else await ctx.reply('🚪 Comando cancelado.')

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
    await this.bot.cache.setexp('es2_user_keys', key, sessionKey, 60 * 60 * 24)
    await this.bot.cache.setexp('es2_sessions', sessionKey, {
      ...initialData,
      sessionKey,
      sessionID: key
    }, 60 * 60 * 24)
    await this.bot.cache.setexp('es2_attached_users', sessionKey, [key], 60 * 60 * 24)

    return {
      ...initialData,
      sessionID: key,
      sessionKey
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
    const userKey = await this.bot.cache.get('es2_user_keys', sessionID)
    if (userKey) sessionID = userKey
    const attachedKeys = await this.bot.cache.get('es2_attached_users', sessionID)
    if (attachedKeys) {
      for (const key of attachedKeys) {
        await this.bot.cache.del('es2_user_keys', key)
      }
    }
    await this.bot.cache.del('es2_attached_users', sessionID)
    await this.bot.cache.del('es2_sessions', sessionID)
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

    const data = await this.createSession(ctx, {
      scene: sceneID,
      currentStep: 0,
      es2Enabled: true,
      sessionKey: ''
    })

    await this.handleSession(ctx as SessionContext<any>, data, scene, data.sessionID, args)
  }

  // ephemeral contexts are a type of context that does not intercept user messages, but simply saves it so commands can ceck for it and use a defined behavior.
  // this is useful, as an example, in the trade command. once a user starts the trade, a EC with the parameter isTrading will be saved for their id, so they can select a card to trade using the /card command.
  // once the trade is finished, the EC is deleted.
  async setEC (userID: number, key: string, value: any) {
    await this.bot.cache.set('es2_ephemeral_contexts', `${userID}.${key}`, value)
  }

  async getEC (userID: number, key: string) {
    return this.bot.cache.get('es2_ephemeral_contexts', `${userID}.${key}`)
  }

  async delEC (userID: number, key: string) {
    return this.bot.cache.del('es2_ephemeral_contexts', `${userID}.${key}`)
  }
}

tcqc.add<string>('es2-end-session', async (ctx) => {
  const data = ctx.data
  if (data.split('.').length === 2) {
    const [_, uid] = data.split('.')
    if (ctx.from.id.toString() != uid) return

    await _brklyn.es2.cancelSession(ctx)
    return
  }

  await _brklyn.es2.cancelSession(ctx)
})
