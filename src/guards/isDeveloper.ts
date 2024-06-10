let ids = [6354439429, 1889562226]
if (!process.env.JANET_VERSION) ids = ids.concat([6657417699, 1381335884])

export default (ctx) => {
  return ids.includes(ctx.update.message.from.id)
}
