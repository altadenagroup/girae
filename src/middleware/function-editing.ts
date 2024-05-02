import { Context } from 'telegraf'
import { escapeForHTML } from '../utilities/responses.js'
import { BotContext } from '../types/context.js'
import { error } from 'melchior'
import * as Sentry from '@sentry/node'

interface ScheduledRequests {
  fnName: string
  ctx: BotContext
  extra: any
  data: any
  retries: number
  retryAfter?: number
  addedOn: number
}

const scheduledRequests: ScheduledRequests[] = []

const scheduleRequest = (fnName: string, ctx: BotContext, data: any, extra: any, retries: number, retryAfter?: number) => {
  scheduledRequests.push({
    fnName,
    ctx,
    extra,
    data,
    retries,
    retryAfter,
    addedOn: Date.now()
  })
}

const retryRequest = async (req: ScheduledRequests) => {
  const fn = req.ctx[req.fnName]
  return fn(req.data, req.extra)
}

setInterval(async () => {
  const now = Date.now()
  for (const req of scheduledRequests) {
    if (now - req.addedOn > 60 * 1000) {
      // get the request, remove it from the array and try again. if it fails, add it back
      // do not add it back if it has already retried 3 times
      const index = scheduledRequests.indexOf(req)
      scheduledRequests.splice(index, 1)
      await retryRequest(req).then(() => {
        // @ts-ignore
        req.ctx = null
      }).catch((e) => {
        if (req.retries < 3) {
          req.retries++
          scheduleRequest(req.fnName, req.ctx, req.extra, req.data, req.retries, req.retryAfter)
        }
        error('function-editing', 'retried request too many times. error is ' + e.message)
      })
    }
  }
}, 1000)

const errorHandler = (fn: any, ...args: any[]) => {
  return (e) => {
    if (!e.description) {
      Sentry.captureException(e)
      return false
    }
    if (e.description.includes('Too Many Requests')) {
      const retryAfter = e.parameters.retry_after
      scheduleRequest(fn.name, args[0], args[1], args[2], 0, retryAfter)
      return true
    } else if (e.description.includes('not modified')) {
      return true
    } else if (e.description.includes('not enough rights')) {
      return true
    } else {
      throw e
    }
  }
}

export const functionEditing = (ctx: Context, next: () => void) => {
  // makes methods like reply automatically quote the message
  if (ctx.message) {
    // @ts-ignore
    ctx.ogReply = ctx.reply
    // @ts-ignore
    ctx.reply = (data: any, extra: any) => {
      // @ts-ignore
      if (ctx.chat?.type === 'private') return ctx.ogReply(data, extra).catch(errorHandler(ctx.ogReply, ctx, data, extra))
      const args = { reply_to_message_id: ctx.message!.message_id, ...extra }
      // @ts-ignore
      return ctx.ogReply(data, args).catch(errorHandler(ctx.ogReply, ctx, data, extra))
    }
  }

  // same for sendPhoto
  if (ctx.message) {
    // @ts-ignore
    ctx.ogReplyWithPhoto = ctx.replyWithPhoto
    // @ts-ignore
    ctx.replyWithPhoto = (data: any, extra: any) => {
      const args = { reply_to_message_id: ctx.message!.message_id, ...extra }
      // @ts-ignore
      return ctx.ogReplyWithPhoto(data, args).catch(errorHandler(ctx.ogReplyWithPhoto, ctx, data, extra))
    }
  }

  // and replyWithAnimation
  if (ctx.message) {
    // @ts-ignore
    ctx.ogReplyWithAnimation = ctx.replyWithAnimation
    // @ts-ignore
    ctx.replyWithAnimation = (data: any, extra: any) => {
      const args = { reply_to_message_id: ctx.message!.message_id, ...extra }
      // @ts-ignore
      return ctx.ogReplyWithAnimation(data, args).catch(errorHandler(ctx.ogReplyWithAnimation, ctx, data, extra))
    }
  }

  // and replyWithHTML
  if (ctx.message) {
    // @ts-ignore
    ctx.ogReplyWithHTML = ctx.replyWithHTML
    // @ts-ignore
    ctx.replyWithHTML = (data: any, extra: any) => {
      if (ctx.chat?.type === 'private') return ctx.ogReplyWithHTML(data, extra).catch(errorHandler(ctx.ogReplyWithHTML, ctx, data, extra))
      const args = { reply_to_message_id: ctx.message!.message_id, ...extra }
      // @ts-ignore
      return ctx.ogReplyWithHTML(data, args).catch(errorHandler(ctx.ogReplyWithHTML, ctx, data, extra))
    }
  }

  if (ctx.from) {
    // @ts-ignore
    ctx.from.raw_first_name = ctx.from.first_name
    ctx.from.first_name = escapeForHTML(ctx.from.first_name)
  }

  // @ts-ignore
  if (ctx.chat?.id === -1002119624679 && !ctx.message?.text?.endsWith?.('@giraebetabot') && process.env.RUN_BETA) return

  // add a small error handling system for the answerCallbackQuery method (so old queries won't throw an error and halt stack exec fully)
  if (ctx.answerCbQuery) {
    // @ts-ignore
    ctx.ogAnswerCbQuery = ctx.answerCbQuery
    // @ts-ignore
    ctx.answerCbQuery = (...args) => {
      // @ts-ignore
      return ctx.ogAnswerCbQuery(...args).catch((e) => {
        if (e.description.includes('query is too old')) {
          return true
        } else {
          throw e
        }
      })
    }
  }

  return next()
}
