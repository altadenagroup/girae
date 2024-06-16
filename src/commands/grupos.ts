import { BotContext } from '../types/context.js';

export default async (ctx: BotContext) => {
    return ctx.reply('Veja todos os meus grupos oficiais aqui:', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '⭕ Clique aqui',
                        url: 'https://t.me/addlist/o610KVR8eMoxMDEx'
                    }
                ]
            ]
        }
    });
}
