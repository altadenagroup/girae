import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
    if (ctx.userData.usedDraws >= ctx.userData.maximumDraws) {
        // return ctx.reply('Ah... sinto muito, mas você já girou os dados que podia hoje. 😣\nTente novamente amanhã!')
    }
    
    return ctx.scene.enter('DRAW_SCENE', {
        user: { isAdmin: ctx.userData.isAdmin },
        argZero: ctx.args[0]
    })
}

export const info = {
    guards: ['hasJoinedGroup'],
    aliases: ['draw']
}
