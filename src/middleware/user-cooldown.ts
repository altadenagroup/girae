import { debug, info } from 'melchior'
import { Context } from 'telegraf'

const cooldownBucket = {
  get: async (id: number) => {
    const r = await _brklyn.cache.get('cooldowns', id.toString())
    if (!r) await _brklyn.cache.setexp('cooldowns', id.toString(), 0, 60)
    return r || 0
  },
  incr: (id: number) => {
    return _brklyn.cache.incr('cooldowns', id.toString())
  },
  decr: (id: number) => {
    return _brklyn.cache.decr('cooldowns', id.toString())
  }
}

const greyASCII = (text) => `\x1b[90m${text}\x1b[0m`
const boldASCII = (text) => `\x1b[1m${text}\x1b[0m`

export default async (ctx: Context, next: () => void) => {
  // @ts-ignore
  if (ctx.message && ctx.message.text?.startsWith?.('/')) {
    const userCmds = await cooldownBucket.get(ctx.from!.id)
    if (userCmds > 3) {
      info('cooldown', `user ${ctx.from!.first_name} (${ctx.from!.id}) is on cooldown`)
      return ctx.reply('Ei, você está usando meus comandos rápido demais! Tente novamente em 5 segundos.\n\n👮‍♀️ Floodar comandos de propósito pode levar ao seu ban, então pare!')
    }

    await cooldownBucket.incr(ctx.from!.id)
    setTimeout(() => cooldownBucket.decr(ctx.from!.id), 4000)

    // @ts-ignore
    debug('commands', `${greyASCII(ctx.from!.first_name)} (${ctx.from.id}) -> ${greyASCII(ctx.chat?.id === ctx.from?.id ? 'DM' : ctx.chat?.title)}${ctx.chat?.id === ctx.from?.id ? '' : ` (${ctx.chat.id})`} -> ${boldASCII(ctx.message.text.split(' ')[0].split('@')[0].replace('/', ''))} (usage is ${userCmds})`)
    return next()
  }
  return next()
}
