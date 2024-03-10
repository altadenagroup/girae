import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
    if (ctx.userData.usedDraws >= ctx.userData.maximumDraws) {
        return ctx.reply('Ah... sinto muito, mas você já girou os dados que podia hoje. 😣\nTente novamente amanhã!')
    }

   ctx.es2.enter('START_DRAW').catch(() => undefined)
}

export const info = {
    guards: ['hasJoinedGroup'],
    aliases: ['draw']
}
