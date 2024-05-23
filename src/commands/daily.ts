import { DAILY_CRON } from '../sidecar/index.js'
import { BotContext } from '../types/context.js'
import { addBalance } from '../utilities/engine/economy.js'

const DAILY_REWARD = 100

export default async (ctx: BotContext) => {
  if (ctx.userData!.hasGottenDaily) {
    return ctx.reply('Você já pegou sua recompensa diária hoje. 😊\nVolte daqui ' + _brklyn.sidecar.willRunIn(DAILY_CRON) + '.')
  }

  const streak = await increaseStreak(ctx)

  let added = DAILY_REWARD
  // if the user has a streak of 7, give them a bonus
  // if they have a streak of 30, 60, 90, etc, give them 2 extra draws
  let weeklyBonus = ''
  if (streak % 7 === 0) {
    weeklyBonus = '🔥 Vi aqui e você obteve seu daily por uma semana sem falta! Que dedicação...\nTe dei mais dinheiro pelo seu esforço.\n\n'
    added += 100
  }

  if (streak % 30 === 0) {
    await _brklyn.db.user.update({
      where: { id: ctx.userData!.id },
      data: { maximumDraws: ctx.userData!.maximumDraws + 2 }
    })
    added += 400

    weeklyBonus = '🥵 Vi aqui e você obteve seu daily por um mês sem falta! Que dedicação...\nTe dei mais dois giros por dia e mais dinheiro pelos seus esforços.\n\n'
  }
  added = added * 2
  const daysToNextBonus = 7 - (streak % 7)

  await addBalance(ctx.userData!.id, added)
  return ctx.reply(`💰 Você obteve ${added} moedas! 💰\n\n${weeklyBonus}📆 Continue pegando seu daily todo dia por mais ${daysToNextBonus} dia${daysToNextBonus === 1 ? '' : 's'} para receber um bônus.\n🚒 ${streak} dia${streak === 1 ? '' : 's'} pegando o daily consecutivamente`)
}

const increaseStreak = async (ctx: BotContext): Promise<number> => {
  // if the user hasn't missed a day, increase the streak
  if (ctx.userData!.lastDaily) {
    const lastDaily = new Date(ctx.userData!.lastDaily)
    const today = new Date()

    if (lastDaily.getDate() === today.getDate() - 1 || (lastDaily.getDate() === 30 && today.getDate() === 1)) {
      await _brklyn.db.user.update({
        where: { id: ctx.userData!.id },
        data: { dailyStreak: ctx.userData!.dailyStreak + 1, hasGottenDaily: true, lastDaily: new Date() }
      })

      return ctx.userData!.dailyStreak + 1
    }
  }

  // if the user missed a day, reset the streak
  await _brklyn.db.user.update({
    where: { id: ctx.userData!.id },
    data: { dailyStreak: 1, lastDaily: new Date(), hasGottenDaily: true }
  })

  return 1
}

export const info = {
  guards: ['hasJoinedGroup', 'isWhitelistedGroup'],
  aliases: ['reward', 'recompensa', 'diario']
}
