import { DRAW_CRON } from '../sidecar/index.js'
import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  if (await _brklyn.cache.get('is_drawing', ctx.from?.id.toString())) {
    const url = await _brklyn.cache.get('is_drawing', ctx.from?.id.toString())
    if (url.startsWith) {
      return ctx.reply('🕹 Você já está girando. Por favor, espere até que o giro atual termine.\n\nCaso a mensagem tenha sido deletada, use /cancelar para poder girar de novo.', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔄 Ir à mensagem do giro', url: url }]]
        }
      })
    }

    return ctx.reply('🕹 Você já está girando. Por favor, espere até que o giro atual termine.')
  }

  if (ctx.userData.usedDraws >= ctx.userData.maximumDraws) {
    return ctx.replyWithHTML('Ah... sinto muito, mas você já girou os cards que podia por agora. 😣\nVocê receberá mais um giros em ' + _brklyn.sidecar.willRunIn(DRAW_CRON) + '.\n\nP.S.: Você sabia que agora você pode comprar giros usando suas moedas? Use <code>/comprar giros quantidade</code>!')
  }

  const cooldownDraws = await _brklyn.cache.get('draw_cooldowns', ctx.from?.id.toString()) || 0
  const groupCooldownDraws = await _brklyn.cache.get('draw_cooldowns', ctx.chat!.id.toString()) || 0

  if (cooldownDraws > 3 || groupCooldownDraws > 2) {
    return ctx.reply('🕹 Aaah, que bagunça, estão girando muito rápido! Por favor, espere um pouco antes de girar novamente.')
  }

  ctx.es2.enter('START_DRAW').catch(() => undefined)
}

export const info = {
  guards: ['hasJoinedGroup', 'isWhitelistedGroup'],
  aliases: ['draw', 'rodar', 'rechear']
}
