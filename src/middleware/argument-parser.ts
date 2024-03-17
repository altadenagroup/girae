export default async (ctx, next) => {
  // if it isn't a message, return
  if (ctx.message?.text) {
    // parse arguments
    const args = ctx.update.message.text.split(' ')
    // remove the first element, which is the command itself
    args.shift()
    ctx.args = args
    // if the ctx.message.reply_to_message contains the prop forum_topic_created, delete it
    if (ctx.message.reply_to_message && ctx.message.reply_to_message.forum_topic_created) {
      delete ctx.message.reply_to_message
    }
  }
  return next()
}
