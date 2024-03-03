import { getCardByID, getCardByName } from './engine/cards.js'
import { CommonMessageBundle, User } from 'telegraf/types'
import { BotContext } from '../types/context.js'
import { getUserByMentionOrID } from './telegram.js'

// gets a card argument. it can be a number (which would be the card id) or a string (which would be the card name)
export const getCardFromArg = async (arg: string)  => {
    if (!arg) return null
    if (!isNaN(Number(arg))) {
        return getCardByID(Number(arg))
    } else {
        return getCardByName(arg)
    }
}

export const getUserFromQuotesOrAt = async (ctx: BotContext, arg: string | undefined): Promise<User | null> => {
  if (arg && false) { // disable this for now: we'll have to write a namekeeping service 🥴
    const member = await getUserByMentionOrID(ctx, arg!).catch(() => null)
    console.log(member)
    if (member) return member!.user
  }

  const quoted = (ctx.message as CommonMessageBundle).reply_to_message!.from
  if (quoted) return quoted
  return null
}
