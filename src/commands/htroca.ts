import { User } from 'telegraf/types.js'
import { BotContext } from '../types/context.js'
import { getMentionedTgUser, getMentionedUser, getTgUserFromText, mentionUser } from '../utilities/telegram.js'

export default async (ctx: BotContext) => {
  const tgUser = await getMentionedTgUser(ctx, ctx.args[0])
  const userD = await getMentionedUser(ctx, ctx.args[0])
  if (!tgUser || !userD) {
    return ctx.reply('O usuário não foi encontrado. Ele já usou a bot?')
  }

  // how many times the user has initiated a trade
  const initiated = await _brklyn.db.consumedTrade.count({ where: { user1Id: userD.id } })
  const received = await _brklyn.db.consumedTrade.count({ where: { user2Id: userD.id } })

  if (initiated === 0 && received === 0) {
    return ctx.reply('Esse usuário não tem trocas registradas.')
  }

  // get the id of all users they have traded with and get the top 5 most traded with
  const tradeGivingEnd = await _brklyn.db.consumedTrade.findMany({
    where: { user1Id: userD.id },
    select: { user2Id: true }
  })
  const tradeReceivingEnd = await _brklyn.db.consumedTrade.findMany({
    where: { user2Id: userD.id },
    select: { user1Id: true }
  })

  const tradeGiving = {}
  const tradeReceiving = {}
  const nameMap = {}

  for (const x of tradeGivingEnd) {
    if (tradeGiving[x.user2Id]) {
      tradeGiving[x.user2Id]++
    } else {
      tradeGiving[x.user2Id] = 1
      const user = await getTgUserFromText(x.user2Id.toString())
      nameMap[x.user2Id] = user || { id: x.user2Id, first_name: 'Usuário desconhecido' }
    }
  }

  for (const x of tradeReceivingEnd) {
    if (tradeReceiving[x.user1Id]) {
      tradeReceiving[x.user1Id]++
    } else {
      tradeReceiving[x.user1Id] = 1
      const user = await getTgUserFromText(x.user1Id.toString())
      nameMap[x.user1Id] = user || { id: x.user1Id, first_name: 'Usuário desconhecido' }
    }
  }

  const text = `🔄 Trocas de <b>${tgUser.first_name}</b>

🔁 <b>Realizadas no total</b>: ${initiated + received}
🔄 <b>Iniciadas por ${tgUser.first_name}</b>: ${initiated}
🔄 <b>Recebidas por ${tgUser.first_name}</b>: ${received}

<b>Top 5 usuários que ${tgUser.first_name} trocou mais cartas (iniciando)</b>:
${generateTop5(tradeGiving, nameMap)}

<b>Top 5 usuários que ${tgUser.first_name} recebeu mais cartas (recebendo)</b>:
${generateTop5(tradeReceiving, nameMap)}
  `

  return ctx.replyWithHTML(text)
}

const generateTop5 = (data: Record<string, number>, nameMap: Record<string, User>) => {
  return Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count], i) => `${i + 1}. <b>${mentionUser(nameMap[id])}</b> (<code>${id}</code>) - <i>${count} trocas</i>`).join('\n')
}

export const info = {
  guards: ['isAdmin']
}
