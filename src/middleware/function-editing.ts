import { Context } from 'telegraf'

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

  return next()
}
