import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  if (ctx.chat!.type !== 'private') {
    return
  }

  return ctx.reply('Para acessar a loja da Giraê...', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '⭕ Clique aqui',
            web_app: {
              url: 'https://girae-web-app-dev.altadena.space/store'
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
