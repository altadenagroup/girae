import type { Card, Category, Rarity, Subcategory } from '@prisma/client'
import { BotContext } from '../types/context.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { determineMethodToSendMedia } from '../utilities/telegram.js'
import {
  getCardByID,
  getHowManyCardsAreThere,
  getNamesOfSecondarySubcategories,
  searchCards
} from '../utilities/engine/cards.js'
import { getHowManyCardsUserHas, getHowManyUsersHaveCard } from '../utilities/engine/users.js'
import { readableNumber } from '../utilities/misc.js'
import { ALBUM_SUBCATEGORIES, ARTIST_CATEGORY_IDS, DISCOTECA_ID, MEDAL_MAP, MISSING_CARD_IMG, TRACK_SUBCATEGORIES, cativeiroEmoji } from '../constants.js'
import { tcqc } from '../sessions/tcqc.js'

interface FullCard extends Card {
  subcategory: Subcategory | undefined
  rarity: Rarity | undefined
  category: Category | undefined
}

// escapes names containg chars used by pgsql full text search
const escapeName = (name: string) => name.replace(/([!|&(){}[\]^"~*?:\\])/g, '\\$1')

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID do personagem a ser pesquisado', '/fav Katsuragi Misato')
  if (!isNaN(parseInt(ctx.args.join(' ')))) {
    const id = parseInt(ctx.args.join(' '))
    const card = await getCardByID(id)
    if (!card) return ctx.responses.replyCouldNotFind('um personagem com esse ID')
    return viewCard(ctx, card as FullCard)
  }

  const cards = await searchCards(escapeName(ctx.args.join(' ')).split(' ').join(' & '), 100)
  if (!cards || !cards[0]) return ctx.responses.replyCouldNotFind('um personagem com esse nome')
  if (cards.length === 1) return viewCard(ctx, cards[0] as FullCard)

  const text = cards.map(cardOnList).join('\n')
  return ctx.replyWithHTML(`🔍 <b>${cards.length}</b> resultados encontrados:\n\n${text}\n\nPara ver um desses cards, use <code>/card id</code>`)
}

const viewCard = async (ctx: BotContext, char: FullCard) => {
  const img = parseImageString(char.image, 'ar_3:4,c_crop')

  const repeated = await getHowManyCardsUserHas(ctx.userData.id, char.id)
  const userWithCard = await getHowManyUsersHaveCard(char.id)
  const inCirc = await getHowManyCardsAreThere(char.id)
  const secondNames = await getNamesOfSecondarySubcategories(char.id)
  let extraAlbumText = ''

  if (TRACK_SUBCATEGORIES.includes(char.subcategoryId!) && ctx.profileData.lastFmUsername && secondNames.length > 0) {
    const track = await _brklyn.fm.getHowManyTimesUserHasScrobbled('track', ctx.profileData.lastFmUsername, char.name, secondNames[0].name)
    if (track) extraAlbumText = ` e ${track} scrobble${track === 1 ? '' : 's'} nesta música`
  }

  if (ALBUM_SUBCATEGORIES.includes(char.subcategoryId!) && ctx.profileData.lastFmUsername && !TRACK_SUBCATEGORIES.includes(char.subcategoryId!)) {
    const album = await _brklyn.fm.getHowManyTimesUserHasScrobbled('album', ctx.profileData.lastFmUsername, char.name, secondNames[0].name)
    if (album) extraAlbumText = ` e ${album} scrobble${album === 1 ? '' : 's'} neste álbum`
  }

  if (ARTIST_CATEGORY_IDS.includes(char.categoryId) && ctx.profileData.lastFmUsername) {
    const artist = await _brklyn.fm.getHowManyTimesUserHasScrobbled('artist', ctx.profileData.lastFmUsername, char.name)
    if (artist) extraAlbumText = ` e ${artist} scrobble${artist === 1 ? '' : 's'} neste artista`
  }

  if (char.categoryId === DISCOTECA_ID && ctx.profileData.lastFmUsername) {
    const album = await _brklyn.fm.getHowManyTimesUserScrobbledAlbum(ctx.profileData.lastFmUsername, char.name, secondNames[0].name)
    if (album) extraAlbumText = ` e ${album} scrobble${album === 1 ? '' : 's'} neste álbum`
  }

  const tagExtra = secondNames.length > 0 ? `\n🔖 ${secondNames.map(t => t.name).join(', ')}` : ''
  const text = `${MEDAL_MAP[char.rarity?.name || 'Comum']} <code>${char.id}</code>. <b>${char.name}</b> ${cativeiroEmoji(repeated)}
${char.category?.emoji || '?'} <i>${char.subcategory?.name || '?'}</i>${tagExtra}

👨‍👨‍👧‍👧 ${readableNumber(userWithCard)} pessoa${userWithCard === 1 ? '' : 's'} com este card
📦 ${readableNumber(inCirc)} vez${inCirc === 1 ? '' : 'es'} girado
👾 ${ctx.from?.first_name} tem ${repeated} card${repeated === 1 ? '' : 's'}${extraAlbumText}`

  // check if is currently trading
  let additionOpts = {}
  const ec = await _brklyn.es2.getEC(ctx.from.id, 'tradeData')
  if (ec && repeated > 0) {
    additionOpts = {
      reply_markup: {
        inline_keyboard: [
          [{
            text: '➕ Trocar este card',
            callback_data: tcqc.generateCallbackQuery('add-card', { cid: char.id })
          }],
          [{
            text: '➖ Retirar este card da troca',
            callback_data: tcqc.generateCallbackQuery('remove-card', { cid: char.id })
          }]
        ]
      }
    }
  }

  const method = determineMethodToSendMedia(img)
  return ctx[method!](img, {
    caption: text,
    parse_mode: 'HTML',
    ...additionOpts
  }).catch(() => {
    return ctx.replyWithPhoto(MISSING_CARD_IMG, { caption: text, parse_mode: 'HTML' })
  })
}

const cardOnList = (card) => `${MEDAL_MAP[card.rarity?.name || 'Comum']} <code>${card.id}</code>. <b>${card.name}</b> ${card.category?.emoji || '?'} <i>${card.subcategory?.name || '?'}</i>`

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['view', 'ver']
}
