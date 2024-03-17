import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  const metadata = await _brklyn.getDittoMetadata()

  const text = `🏓 Ping! ${Math.ceil((Date.now() / 1000) - ctx.message?.date!)}s de delay entre o Telegram ao bot.

<b>Status dos serviços</b>
Gerador de imagens: <b>${metadata ? '🟢 ONLINE' : '🔴 OFFLINE'}</b>

<b>Geral</b>
Instância: <b>${process.env.SENTRY_DSN ? 'Produção' : 'Desenvolvimento'}</b>

    `

  return ctx.replyWithHTML(text)
}

