import { BotContext } from "../types/context.js"
import deleteCommand from "./delete.js"

export default async (ctx: BotContext) => {
  if (ctx.args[0] && ctx.args[0].startsWith('delete')) {
    ctx.args = [ctx.args[0].split('-')[1]]
    return deleteCommand(ctx)
  }

  return ctx.reply('oii')
}

