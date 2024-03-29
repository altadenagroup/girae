import { BotContext } from "../types/context.js"

export default async (ctx: BotContext) => {
  return ctx.reply('Este comando está sendo desenvolvido. Pressione a @mcthaa para ele sair mais rápido!')
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['cats']
}
