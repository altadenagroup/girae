import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  const token = ctx.args[0]
  if (!token) {
    return ctx.reply('Você precisa especificar o token do bot que você deseja usar. Exemplo: /clone 654538734:AAHJHJHJHJHJHJHJ')
  }

  const bot = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json()).catch(() => null)
  if (!bot || !bot.ok) {
    return ctx.reply('Bot não encontrado.')
  }

  await _brklyn.db.alternativeVersion.create({
    data: {
      telegramToken: token
    }
  })

  await _brklyn.cache.set('girae_clones', token, true)

  const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook?max_connections=100&url=${encodeURIComponent('https://girae-ingress.altadena.space/bot/' + token)}`).then(r => r.json()).catch(() => null)
  if (!r || !r.ok) {
    return ctx.reply('Erro ao definir webhook.')
  }

  return ctx.replyWithHTML(`Bot <b>${bot.result.username}</b> clonado com sucesso!`)
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
