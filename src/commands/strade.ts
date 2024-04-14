import { CommonMessageBundle } from 'telegraf/types'
import { BotContext } from '../types/context.js'
import { getUserFromQuotesOrAt } from '../utilities/parser.js'
import { getCardFullByID } from '../utilities/engine/cards.js'
import { getOrCreateGroupConfig } from '../utilities/engine/group.js'

export default async (ctx: BotContext) => {
  if (ctx.chat?.type !== 'supergroup') return ctx.reply('Esse comando só pode ser usado em grupos!')
  const config = await getOrCreateGroupConfig(ctx.chat!.id)
  if (!config.allowSimpleTrade && !ctx.userData.isAdmin) return ctx.reply('Esse grupo não tem permissão para realizar trocas simples. Sinto muito! 😅')

  if (!(ctx.message as CommonMessageBundle).reply_to_message) return ctx.reply('Você precisa responder a uma mensagem de um usuário para trocar cartas com ele. Do mesmo jeito que fiz nessa mensagem aqui! 😊')
  const user = await getUserFromQuotesOrAt(ctx, '')
  if (!user) return ctx.responses.replyCouldNotFind('o usuário que você quer realizar a troca de cartas')
  if (user?.id === ctx.from!.id) return ctx.reply('Você não pode trocar cartas com você mesmo! 😅')
  if (!ctx.args[0] || !ctx.args[1]) {
    return ctx.reply('Você precisa especificar duas cartas para trocar.\n\nUsa-se /stroca carta1 carta2.')
  }

  const nUser = await _brklyn.db.user.findFirst({ where: { tgId: user.id } })
  if (!nUser) {
    return ctx.reply('O usuário mencionado nunca usou a bot! Talvez você marcou a pessoa errada?')
  }

  // arg[0] is the card they wanna trade and arg[1] is the card they wanna receive from the user
  const card1 = await getCardFullByID(parseInt(ctx.args[0]))
  const card2 = await getCardFullByID(parseInt(ctx.args[1]))

  if (!card1 || !card2) {
    const missingCard = !card1 ? 'o card que você quer trocar' : (!card2 ? 'o card que você quer receber' : 'nenhum dos cards')
    return ctx.reply(`Não foi possível encontrar ${missingCard}. Corriga o ID e tente novamente.`)
  }

  // check if users have the cards they want to trade
  const userCardCount1 = await _brklyn.db.userCard.findFirst({ where: { userId: ctx.userData.id, cardId: card1.id } })
  if (!userCardCount1) {
    return ctx.replyWithHTML(`Você não tem nenhum card de <b>${card1.name}</b> para trocar!`)
  }

  const userCardCount2 = await _brklyn.db.userCard.findFirst({ where: { userId: nUser.id, cardId: card2.id } })
  if (!userCardCount2) {
    return ctx.replyWithHTML(`O usuário mencionado não tem nenhum card de <b>${card2.name}</b> para trocar!`)
  }

  return ctx.es2.enter('CONFIRM_TRADE', {
    card1,
    card2,
    user1: { name: ctx.from!.first_name, id: ctx.from!.id },
    user2: { name: user.first_name, id: user.id },
    ucid1: userCardCount1.id,
    ucid2: userCardCount2.id
  })
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['strocar', 'stroca']
}
