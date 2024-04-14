import type { ProfileSticker } from '@prisma/client'
import { BotContext } from '../types/context.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { determineMethodToSendMedia } from '../utilities/telegram.js'
import { readableNumber } from '../utilities/misc.js'
import { MISSING_CARD_IMG } from '../constants.js'
import { findStoreItem } from '../utilities/engine/store.js'
import { getStickerByID, searchStickers } from '../utilities/engine/vanity.js'

// escapes names containg chars used by pgsql full text search
const escapeName = (name: string) => name.replace(/([!|&(){}[\]^"~*?:\\])/g, '\\$1')

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID do sticker a ser visto', '/sticker Ariana Grande')
  if (!isNaN(parseInt(ctx.args.join(' ')))) {
    const id = parseInt(ctx.args.join(' '))
    const card = await getStickerByID(id)
    if (!card) return ctx.responses.replyCouldNotFind('um sticker com esse ID')
    return viewSticker(ctx, card)
  }

  const bgs = await searchStickers(escapeName(ctx.args.join(' ')).split(' ').join(' & '), 1, 100)
  if (!bgs || !bgs[0]) return ctx.responses.replyCouldNotFind('um sticker com esse nome')
  if (bgs.length === 1) return viewSticker(ctx, bgs[0])

  const text = bgs.map((t) => `🎟 <code>${t.id}</code>. <b>${t.name}</b>`).join('\n')
  return ctx.replyWithHTML(`🔍 <b>${bgs.length}</b> resultados encontrados:\n\n${text}\n\nPara ver um desses stickers, use <code>/sticker id</code>`)
}

const viewSticker = async (ctx: BotContext, bg: ProfileSticker) => {
  const img = parseImageString(bg.image, false)
  const storeListing = await findStoreItem('STICKER', bg.id)

  const text = `🎟 <code>${bg.id}</code>. <b>${bg.name}</b>
<i>${storeListing?.description || 'Sem descrição.'}</i>

💰 ${storeListing?.price ? (readableNumber(storeListing.price) + ' moedas') : 'Item esgotado'}`


  const method = determineMethodToSendMedia(img)
  return ctx[method!](img, {
    caption: text,
    parse_mode: 'HTML',
  }).catch(() => {
    return ctx.replyWithPhoto(MISSING_CARD_IMG, { caption: text, parse_mode: 'HTML' })
  })
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['figurinha'],
}
