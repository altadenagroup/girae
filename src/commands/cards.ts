import { BotContext } from '../types/context.js'
import { getMentionedTgUser, mentionUser } from '../utilities/telegram.js'

const ROOT_APP_URL = process.env.CARDS_APP_URL || 'https://girae-web-app-dev.altadena.space/cards'
const TG_APP_URL = process.env.TG_CARDS_APP_URL || 'https://t.me/giraebot/giraecards'

export default async (ctx: BotContext) => {
  if (ctx.chat!.type !== 'private') {
    const tgUser = await getMentionedTgUser(ctx, ctx.args[0])
    const url = `${TG_APP_URL}?startapp=${tgUser.id}`
    return ctx.replyWithHTML(`<a href="${url}">Veja todas as cartas e coleções ${ctx.from.id === tgUser.id ? 'suas' : ('de ' + mentionUser(tgUser))} clicando aqui!</a>`)
  }

  return ctx.reply('Para ver sua coleção...', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '⭕ Clique aqui',
            web_app: {
              url: ROOT_APP_URL
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
