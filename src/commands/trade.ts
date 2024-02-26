import { CommonMessageBundle, User } from "telegraf/types"
import { BotContext } from "../types/context.js"
import { getUserFromQuotesOrAt } from "../utilities/parser.js"

export interface TradeContext extends BotContext {
  tradingWith: User
}

export default async (ctx: BotContext) => {
  if (!(ctx.message as CommonMessageBundle).reply_to_message) return ctx.responses.gottaQuote('quem você quer trocar suas cartas')
  const user = await getUserFromQuotesOrAt(ctx, ctx.args[0])
  if (!user) return ctx.responses.replyCouldNotFind('o usuário que você quer realizar a troca de cartas')
  if (user.id === ctx.from!.id) return ctx.reply('Você não pode trocar cartas com você mesmo! 😅')

  // inline button that opens a private chat with the user
  // @ts-expect-error
  ctx.tradingWith = user
  return ctx.scene.enter('START_TRADE')
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['trocar', 'troca']
}

