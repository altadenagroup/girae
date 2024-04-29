import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  return ctx.replyWithHTML('A loja ainda está sendo construída...\nEnquanto isso, você pode usar o <code>/bg</code> para comprar e equipar backgrounds, <code>/sticker</code> para comprar e equipar stickers, e <code>/comprar giros</code> para comprar giros.')

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
              url: 'https://girae-web-app-dev.altadena.space/loja'
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
