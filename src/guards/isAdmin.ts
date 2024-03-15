import { BotContext } from '../types/context.js'

export default (ctx: BotContext) => ctx.userData.isAdmin || ctx.chat?.id === -1001945644138
