import { BotContext } from "../types/context.js"

export default async (ctx: BotContext) => {
    if (ctx.scene) {
      await ctx.scene.leave()
      return ctx.replyWithHTML('Operação cancelada.')
    }
}

