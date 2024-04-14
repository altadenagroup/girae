import { BotContext } from '../types/context.js'
import { getTopCardUsers, getTopReputationUsers, getTopRichestUsers } from '../utilities/engine/ranking.js'
import { readableNumber } from '../utilities/misc.js'
import { getUserFromNamekeeper, mentionUser } from '../utilities/telegram.js'

const LIMIT = 5

const formatUsers = (sortByProperty, itemName) => {
  // get user information and return built text
  return async (users) => {
    const names = {}
    for (const user of users) {
      const d = await getUserFromNamekeeper(user.tgId)
      names[user.id] = d || { first_name: 'Usuário desconhecido' }
    }

    return users.map((user, i) => {
      return `  ${i + 1}. <b>${mentionUser({ ...names[user.id], ...user })}</b> (<code>${user.id}</code>) - ${readableNumber(user[sortByProperty])} ${itemName}`
    }).join('\n')
  }
}

export default async (ctx: BotContext) => {
  const money = await getTopRichestUsers(LIMIT)
  const reps = await getTopReputationUsers(LIMIT)
  const cards = await getTopCardUsers(LIMIT)

  const moneyText = await formatUsers('coins', 'moedas')(money)
  const repsText = await formatUsers('reputation', 'pontos')(reps)
  const cardsText = await formatUsers('count', 'cards')(cards)

  return ctx.replyWithHTML(`🏆 <b>Ranking global da Giraê</b> 🏆

💰 <b>Usuários mais ricos:</b>

${moneyText}

🌟 <b>Usuários com mais pontos de reputação:</b>

${repsText}

🃏 <b>Usuários com mais cards:</b>

${cardsText}`, {
    // @ts-ignore
    disable_web_page_preview: true
  })
}

export const info = {
  guards: ['hasJoinedGroup']
}
