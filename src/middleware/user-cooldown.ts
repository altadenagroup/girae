import {debug, info} from 'melchior'
import {Context} from 'telegraf'

const cooldownBucket = {
  get: async (id: number) => {
    return await _brklyn.cache.get('cooldowns', id.toString()) || 0
  },
  set: (id: number, value: number) => {
    return _brklyn.cache.setexp('cooldowns', id.toString(), value, 60)
  }
}

const greyASCII = (text) => `\x1b[90m${text}\x1b[0m`
const boldASCII = (text) => `\x1b[1m${text}\x1b[0m`

export default async (ctx: Context, next: () => void) => {
  // @ts-ignore
  if (ctx.message && ctx.message.text?.startsWith?.('/')) {
    const userCmds = await cooldownBucket.get(ctx.from!.id) || 0
    if (userCmds > 3 && ctx.from?.first_name !== 'mc tha') {
      info('cooldown', `user ${ctx.from!.first_name} (${ctx.from!.id}) is on cooldown`)
      return ctx.reply('Ei, você está usando meus comandos rápido demais! Tente novamente em 5 segundos.\n\n👮‍♀️ Floodar comandos de propósito pode levar ao seu ban, então pare!')
    }
    await cooldownBucket.set(ctx.from!.id, userCmds + 1)
    setTimeout(async () => {
      const userCmds = await cooldownBucket.get(ctx.from!.id) || 0
      await cooldownBucket.set(ctx.from!.id, userCmds - 1)
    }, 4000)

    // @ts-ignore
    debug('commands', `${greyASCII(ctx.from!.first_name)} (${ctx.from.id}) -> ${greyASCII(ctx.chat?.id === ctx.from?.id ? 'DM' : ctx.chat?.title)}${ctx.chat?.id === ctx.from?.id ? '' : ` (${ctx.chat.id})`} -> ${boldASCII(ctx.message.text.split(' ')[0].split('@')[0].replace('/', ''))} (usage is ${userCmds})`)
    return next()
  }
  return next()
}
