import { DRAW_CRON } from '../sidecar/index.js'
import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  if (ctx.userData.usedDraws >= ctx.userData.maximumDraws) {
    return ctx.reply('Ah... sinto muito, mas você já girou os cards que podia por agora. 😣\nVocê receberá mais um giros em ' + _brklyn.sidecar.willRunIn(DRAW_CRON) + '.')
  }

  if (await _brklyn.cache.get('is_drawing', ctx.from?.id.toString())) {
    const url = await _brklyn.cache.get('is_drawing', ctx.from?.id.toString())
    if (url.startsWith) {
      return ctx.reply('🕹 Você já está girando, por favor, espere até que o giro atual termine.', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔄 Ir à mensagem do giro', url: url }]]
        }
      })
    }

    return ctx.reply('🕹 Você já está girando, por favor, espere até que o giro atual termine.')
  }

  const cooldownDraws = await _brklyn.cache.get('draw_cooldowns', ctx.from?.id.toString()) || 0
  const groupCooldownDraws = await _brklyn.cache.get('draw_cooldowns', ctx.chat!.id.toString()) || 0

  if (cooldownDraws > 3 || groupCooldownDraws > 5) {
    return ctx.reply('🕹 Aaah, que bagunça, estão girando muito rápido! Por favor, espere um pouco antes de girar novamente.')
  }

  ctx.es2.enter('START_DRAW').catch(() => undefined)
}

export const info = {
  guards: ['hasJoinedGroup', 'isWhitelistedGroup'],
  aliases: ['draw']
}
