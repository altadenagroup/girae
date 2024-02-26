import { isUserOnNewsChannel } from '../utilities/telegram.js'

export default async (ctx) => {
  // if this doesn't have a message, return
  if (!ctx.message) return

    if (!(await isUserOnNewsChannel(ctx.from.id))) {
        await ctx.reply(`Você não está no meu canal de notícias... 😢\nPara poder usar meus comandos, entre já! ${process.env.NEWS_CHANNEL_ID}`)
        return false
    }

    if (ctx.chat?.id === -1002096118477) {
      return true
    }

    return false
}
