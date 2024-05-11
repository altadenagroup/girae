import { BotContext } from '../types/context.js'
import {
  getCardByID
} from '../utilities/engine/cards.js'
import { getUserCardsCount } from '../utilities/engine/users.js'
import { parseImageString } from '../utilities/lucky-engine.js'


export default async (ctx: BotContext) => {
  const cardCount = await getUserCardsCount(ctx.userData.id)
  if (cardCount === 0) return ctx.responses.replyCouldNotFind('nenhum card')
  const args = {
    totalPages: Math.ceil(cardCount / 20),
    totalCards: cardCount,
    name: ctx.from.first_name,
    id: ctx.userData.id,
    imageURL: ctx.profileData.favoriteCardId ? parseImageString(await getCardByID(ctx.profileData.favoriteCardId).then(t => t!.image), false, true) : undefined,
    userID: ctx.userData.id
  }

  return ctx.es2.enter('SHOW_CRDS', args)
  // add add card id 6 to secondary subcategory 78

}

export const info = {
  guards: ['hasJoinedGroup']
}
