import { CommonMessageBundle } from "telegraf/types"
import { BotContext } from "../types/context.js"
import { giveRep } from "../utilities/engine/users.js"
import { getUserFromQuotesOrAt } from "../utilities/parser.js"

export default async (ctx: BotContext) => {
  if (ctx.userData.hasGivenRep) return ctx.reply('Você já deu seu ponto de reputação hoje! 😊')
  if (!(ctx.message as CommonMessageBundle).reply_to_message) return ctx.responses.gottaQuote('dar seu ponto de reputação')
  const user = await getUserFromQuotesOrAt(ctx, ctx.args[0])
  if (!user) return ctx.responses.replyCouldNotFind('o usuário que você quer dar o ponto de reputação')
  if (user.id === ctx.from!.id) return ctx.reply('Você não pode dar um ponto de reputação para si mesmo! 😅')
  const rst = await giveRep(ctx.from!.id, user.id)
  if (!rst) return ctx.reply('Não consegui dar o ponto de reputação... 😢\nSeu amigo já usou o bot antes? Talvez seja este o problema.')
  return ctx.reply(`👍 Você deu um ponto de reputação para ${user.first_name}! Quanta amizade!`)
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['reputação', 'reputation']
}
