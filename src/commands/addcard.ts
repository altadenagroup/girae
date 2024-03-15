import { BotContext } from '../types/context.js'
import { CommonMessageBundle } from 'telegraf/types'

export default async (ctx: BotContext) => {
  // if we arent quoting a message, return
  if (!(ctx.message as CommonMessageBundle).reply_to_message) return ctx.reply('Você precisa responder a uma mensagem para usar este comando.')
  // @ts-ignore
  return ctx.scene.enter('ADD_CARD_SCENE')
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
