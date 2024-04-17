import { getCardByID, getCardByName } from './engine/cards.js'
import { CommonMessageBundle, User } from 'telegraf/types'
import { BotContext } from '../types/context.js'
import { getUserByMentionOrID } from './telegram.js'
import { getSubcategoryByID, getSubcategoryByName, searchSubcategories } from './engine/subcategories.js'
import { escapeNamePG } from './misc.js'
import { getCategoryByID, searchCategory } from './engine/category.js'

// gets a card argument. it can be a number (which would be the card id) or a string (which would be the card name)
export const getCardFromArg = async (arg: string) => {
  if (!arg) return null
  if (!isNaN(Number(arg))) {
    return getCardByID(Number(arg)).catch(() => null)
  } else {
    return getCardByName(arg)
  }
}

export const getSubcategoryFromArg = async (arg: string, onlySecondaries: boolean = false) => {
  if (!arg) return null
  if (!isNaN(Number(arg))) {
    return [await getSubcategoryByID(Number(arg))]
  } else {
    // try getting by name
    const subcategory = await getSubcategoryByName(arg, onlySecondaries)
    if (subcategory) return [subcategory]
    return searchSubcategories(escapeNamePG(arg).split(' ').join(' & '), onlySecondaries)
  }
}

export const getCategoryFromArg = async (arg: string) => {
  if (!arg) return null
  if (!isNaN(Number(arg))) {
    return [await getCategoryByID(Number(arg))]
  } else {
    // try getting by name
    const category = await searchCategory(escapeNamePG(arg).split(' ').join(' & '))
    if (category) return category
    return null
  }
}

export const getUserFromQuotesOrAt = async (ctx: BotContext, arg: string | undefined): Promise<User | null> => {
  if (arg) { // disable this for now: we'll have to write a namekeeping service 🥴
    // @ts-ignore
    return getUserByMentionOrID(ctx, arg)
  }

  const quoted = (ctx.message as CommonMessageBundle).reply_to_message!.from
  if (quoted) return quoted
  return null
}

