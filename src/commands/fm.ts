import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  if (!ctx.profileData.lastFmUsername && !ctx.args[0]) return ctx.responses.replyMissingArgument('seu nome de usuário do last.fm', '/fm giraebot')
  if (!ctx.args[0] && ctx.profileData.lastFmUsername) {
    const last = await _brklyn.fm.getLastScrobble(ctx.profileData.lastFmUsername)
    if (!last) return ctx.replyWithHTML('Não foi possível obter a última faixa escutada. 😔\nNormalmente, isso acontece porque 1. sua conta é privada, ou, 2. você colocou o nome de usuário incorreto.\nPara desconectar a conta atual, use <code>/fm disconnect</code>.')
    const text = `🎵 Sua conta do last.fm já está conectada.\n\nA sua última faixa escutada é <b>${last.trackName}</b> por <b>${last.artistName}</b> ${last.albumName ? `(do álbum <i>${last.albumName}</i>)` : ''}`
    if (last.imageURL) return ctx.replyWithPhoto(last.imageURL, { caption: text, parse_mode: 'HTML' })
    return ctx.replyWithHTML(text)
  }

  if (ctx.args[0] === 'disconnect') {
    await _brklyn.db.userProfile.update({ where: { userId: ctx.userData.id }, data: { lastFmUsername: undefined } })
    return ctx.reply('Sua conta do last.fm foi desconectada com sucesso.')
  }

  const username = ctx.args.join(' ')
  const user = await _brklyn.fm.getFmUser(username)
  if (!user) return ctx.reply('Não foi possível encontrar o usuário informado. 😔\nVerifique se o nome de usuário está correto e tente novamente.')
  await global._brklyn.db.userProfile.update({ where: { userId: ctx.userData.id }, data: { lastFmUsername: username } })
  return ctx.replyWithHTML(`🎵 Olá, <b>${user.realName}</b>! Sua conta foi conectada com sucesso.`)
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['lfm']
}
