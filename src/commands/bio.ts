import { BotContext } from '../types/context.js'
import { setBiography } from '../utilities/engine/users.js'
import { escapeForHTML } from '../utilities/responses.js'

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o texto da sua biografia', '/bio Sou fofa e divertida 😊')
  const bio = ctx.args.join(' ')
  // 100 characters is the maximum length for a bio
  if (bio.length > 100) return ctx.reply('Desculpe, mas a sua biografia não pode ter mais de 100 caracteres. 😅')
  await setBiography(ctx.userData.id, bio)
  return ctx.replyWithHTML(`📝 Sua biografia foi atualizada para:\n\n<code>${escapeForHTML(bio)}</code>`)
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['biografia', 'biography']
}
