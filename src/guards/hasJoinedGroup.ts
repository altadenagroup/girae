import { isUserOnNewsChannel } from '../utilities/telegram.js'

export default async (ctx) => {
  // if this doesn't have a message, return
  if (!ctx.message) return

  if (!(await isUserOnNewsChannel(ctx.from.id))) {
    await ctx.reply(`Você não está no meu canal de notícias... 😢\nPara poder usar meus comandos, entre já! ${process.env.NEWS_CHANNEL_ID}`)
    return false
  }

  // if it's a dm, return
  if (ctx.chat?.type === 'private' && !ctx.message?.text?.includes?.('girar')) {
    return true
  }

  if (ctx.chat?.id === -1002096118477 /*|| ctx.chat?.id === -1002058397651*/ || ctx.chat?.id === -1001945644138 || ctx.chat?.id === -1001786847999) {
    return true
  }

  return false
}
