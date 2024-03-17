import {debug, info} from 'melchior'
import {Context} from 'telegraf'

const cooldownBucket = {
  get: (id: number) => {
    return _brklyn.cache.get('cooldowns', id.toString()) || 0
  },
  set: (id: number, value: number) => {
    return _brklyn.cache.setexp('cooldowns', id.toString(), value, 60)
  }
}

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
      return cooldownBucket.set(ctx.from!.id, userCmds - 1)
    }, 3000)

    // @ts-ignore
    debug('commands', `${ctx.from!.id} at ${ctx.chat?.id} used ${ctx.message.text.split(' ')[0].split('@')[0]} (${userCmds})`)
    return next()
  }
  return next()
}
