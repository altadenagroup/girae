import { BotContext } from '../types/context.js'
import { getMentionedTgUser, mentionUser } from '../utilities/telegram.js'

export default async (ctx: BotContext) => {
  if (ctx.chat!.type !== 'private') {
    const tgUser = await getMentionedTgUser(ctx, ctx.args[0])
    const url = `https://t.me/giraebot/giraecards?startapp=${tgUser.id}`
    return ctx.replyWithHTML(`<a href="${url}">Veja todas as cartas e coleções ${ctx.from.id === tgUser.id ? 'suas' : ('de ' + mentionUser(tgUser))} clicando aqui!</a>`)
  }

  return ctx.reply('Para ver sua coleção...', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '⭕ Clique aqui',
            web_app: {
              url: 'https://girae-web-app-dev.altadena.space/cards'
            }
          }
        ]
      ]
    }
  })
}

export const info = {
  guards: ['hasJoinedGroup']
}
