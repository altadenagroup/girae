export default (ctx) =>
  process.env.JANET_VERSION
    ? ((ctx.update.message.from.id === 6354439429) || (ctx.update.message.from.id === 1889562226) || (ctx.update.message.from.id === 5951890211))
    : (ctx.update.message.from.id === 1889562226)
