import { BotContext } from '../types/context.js';

export default async (ctx: BotContext) => {
    let text = '';

    if (ctx.args[0]?.startsWith?.('grupos')) {
        text = `veja todos os meus grupos oficiais aqui ❤️ :
        
        https://t.me/addlist/o610KVR8eMoxMDEx
        `;
    }
    
    return ctx.reply(text);
}
