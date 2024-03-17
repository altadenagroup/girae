import { DRAW_CRON } from '../sidecar/index.js'
import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  if (ctx.userData.usedDraws >= ctx.userData.maximumDraws) {
    return ctx.reply('Ah... sinto muito, mas você já girou os cards que podia por agora. 😣\nVocê receberá mais 2 giros em ' + _brklyn.sidecar.willRunIn(DRAW_CRON) + '.')
  }

  ctx.es2.enter('START_DRAW').catch(() => undefined)
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['draw']
}
