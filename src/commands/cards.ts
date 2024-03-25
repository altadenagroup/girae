import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  if (ctx.chat!.type !== 'private') {
    return ctx.replyWithMarkdownV2('[Veja todas suas cartas e coleções clicando aqui!](https://t.me/giraebot/giraecards)')
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
  return ctx.scene.enter('SHOW_USER_CARDS')
}

export const info = {
  guards: ['hasJoinedGroup']
}
