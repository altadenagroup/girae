import type { User } from 'telegraf/types.js'
import type { BotContext } from '../types/context.js'
import type { SessionManager } from './manager.js'
import type { SceneController } from './scene.js'

export interface SessionContext<T> extends BotContext {
  session: {
    data: T & {
      _mainMessage?: number
      _messageToBeQuoted?: number
    }
    key: string
    manager: SessionManager
    steps: SceneController
    arguments: { [key: string]: any } | undefined

    attachUserToSession: (user: User) => Promise<void>
    setMainMessage: (messageId: number) => void
    setMessageToBeQuoted: (messageId: number | undefined) => void
    deleteMainMessage: () => Promise<true | void>
    editMainMessageText: (text: string, extra?: any) => Promise<any>
    editMainMessageCaption: (caption: string, extra?: any) => Promise<any>
    setAttribute: (key: string, value: any) => void
    deleteSession: () => void
    nextStepData: (data: string) => string
    getCurrentStepData: <T>(parsingFn: ((string) => T | undefined) | undefined) => T | undefined
    generateSessionQuery (data: string): string
    getDataFromSessionQuery: <T>(parsingFn: ((string) => T | undefined) | undefined) => T | undefined
  }

  callbackQuery: {
    data: string
    id: string
    from: User
    chat_instance: string
  }
}
