import userCooldown from '../middleware/user-cooldown.js'
import { BotContext } from '../types/context.js'
import { isUserOnNewsChannel } from '../utilities/telegram.js'

async function checkCooldown (ctx: BotContext) {
  let hasNextBeenCalled = false
  const next = () => (hasNextBeenCalled = true)
  await userCooldown(ctx, next)
  return hasNextBeenCalled
}

export default async (ctx) => {
  // if this doesn't have a message, return
  if (!ctx.message) return

  const config = await _brklyn.db.groupConfig.findFirst({ where: { groupId: ctx.chat!.id } })
  if ((config?.disabledCommands?.length || 0) > 0) {
    // @ts-ignore
    const commandName = ctx.message.text?.split(' ')[0].replace('/', '').split('@')[0].toLowerCase()
    if (config?.disabledCommands?.includes(commandName)) {
      return false
    }
  }

  if (!(await isUserOnNewsChannel(ctx.from.id))) {
    await ctx.reply(`Você não está no meu canal de notícias... 😢\nPara poder usar meus comandos, entre já! ${process.env.NEWS_CHANNEL_ID}`)
    return false
  }

  const noCooldown = await checkCooldown(ctx)
  return noCooldown
}
