import { BotContext } from "../types/context.js"

export default async (ctx: BotContext) => {
    const metadata = await _brklyn.getDittoMetadata()

    const text = `🏓 Ping! ${Math.ceil((Date.now() / 1000) - ctx.message?.date!)}s de delay entre o Telegram ao bot.

<b>Status dos serviços</b>
${metadata ? '🟢' : '🔴'} Gerador de imagens: ${metadata ? `<b>ONLINE</b> <i>(ditto v${metadata.version}.0, codenome ${metadata.name})</i>` : 'OFFLINE'}

<b>Geral</b>
Instância: <code>${process.env.INSTANCE_NAME || 'Lilin'}</code>
    `

    return ctx.replyWithHTML(text)
}

