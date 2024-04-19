// timeless callback query commands handler

import { debug, error, warn } from 'melchior'
import { BotContext } from '../types/context.js'
import * as Sentry from '@sentry/node'

export type ExtendedBotContext<T> = BotContext & { data: T }
export type HandlerFunction<T> = (ctx: ExtendedBotContext<T>) => Promise<any>

class TCQC {
  handlers: Map<string, HandlerFunction<any>> = new Map()

  add<T> (command: string, handler: HandlerFunction<T>) {
    this.handlers.set(command, handler)
  }

  generateCallbackQuery (command: string, data: any) {
    return `ES2.${command}:${JSON.stringify(data)}`
  }

  async handle (ctx: ExtendedBotContext<any>): Promise<boolean> {
    // @ts-ignore
    const cbData = ctx.callbackQuery?.data
    if (!cbData) return false

    const [command, ...payload] = cbData.replace('ES2.', '').split(':')
    const data = JSON.parse(payload.join(':'))
    debug('tcqc', `got query ES2.${command}`)
    const handler = this.handlers.get(command)
    if (!handler) {
      warn('tcqc', `no handler for ${command}`)
      return false
    }

    ctx.data = data
    Sentry.metrics.increment('tcqc-runs', 1, { tags: { command } })
    await Sentry.startSpan({ op: 'es2.tcqc', name: command }, () => {
      Sentry.setContext('tcqc', { command, data, user: ctx.from, chat: ctx.chat })
      return handler(ctx).catch((e) => {
        error('tcqc', `error while handling ${command}: ${e}`)
        Sentry.captureException(e)
      })
    })

    return true
  }
}

export const tcqc = new TCQC()
