import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  return ctx.reply('mc tha esta fazendo isso shhhh')
  return ctx.scene.enter('SHOW_USER_CARDS')
}

export const info = {
  guards: ['hasJoinedGroup']
}
