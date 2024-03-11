import { Context } from 'telegraf'
import { escapeForHTML } from '../utilities/responses.js'

export const functionEditing = (ctx: Context, next: () => void) => {
  // makes methods like reply automatically quote the message
  if (ctx.message) {
    // @ts-ignore
    ctx.ogReply = ctx.reply
    ctx.reply = (text, extra) => {
      // @ts-ignore
      return ctx.ogReply(text, {
        reply_to_message_id: ctx.message!.message_id,
        ...extra
      })
    }
  }

  // same for sendPhoto
  if (ctx.message) {
    // @ts-ignore
    ctx.ogReplyWithPhoto = ctx.replyWithPhoto
    ctx.replyWithPhoto = (photo, extra) => {
      // @ts-ignore
      return ctx.ogReplyWithPhoto(photo, {
        reply_to_message_id: ctx.message!.message_id,
        ...extra
      })
    }
  }

  // and replyWithAnimation
  if (ctx.message) {
    // @ts-ignore
    ctx.ogReplyWithAnimation = ctx.replyWithAnimation
    ctx.replyWithAnimation = (animation, extra) => {
      // @ts-ignore
      return ctx.ogReplyWithAnimation(animation, {
        reply_to_message_id: ctx.message!.message_id,
        ...extra
      })
    }
  }

  // and replyWithHTML
  if (ctx.message) {
    // @ts-ignore
    ctx.ogReplyWithHTML = ctx.replyWithHTML
    ctx.replyWithHTML = (text, extra) => {
      // @ts-ignore
      return ctx.ogReplyWithHTML(text, {
        reply_to_message_id: ctx.message!.message_id,
        ...extra
      })
    }
  }

  if (ctx.from) {
    // @ts-ignore
    ctx.from.raw_first_name = ctx.from.first_name
    ctx.from.first_name = escapeForHTML(ctx.from.first_name)
  }

  return next()
}
