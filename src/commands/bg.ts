import type { ProfileBackground, ShopItem } from '@prisma/client'
import { BotContext } from '../types/context.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { determineMethodToSendMedia } from '../utilities/telegram.js'
import { readableNumber } from '../utilities/misc.js'
import { MISSING_CARD_IMG } from '../constants.js'
import { findStoreItem } from '../utilities/engine/store.js'
import { checkIfUserOwnsBackground, checkIfUserOwnsSticker, equipBackground, equipSticker, getBackgroundByID, searchBackgrounds } from '../utilities/engine/vanity.js'
import { tcqc } from '../sessions/tcqc.js'
import { InlineKeyboardButton } from 'telegraf/types.js'
import comprar from './comprar.js'

// escapes names containg chars used by pgsql full text search
const escapeName = (name: string) => name.replace(/([!|&(){}[\]^"~*?:\\])/g, '\\$1')

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.responses.replyMissingArgument('o nome ou ID do papel de parede a ser visto', '/bg Ariana Grande')
  if (!isNaN(parseInt(ctx.args.join(' ')))) {
    const id = parseInt(ctx.args.join(' '))
    const card = await getBackgroundByID(id)
    if (!card) return ctx.responses.replyCouldNotFind('um papel de parede com esse ID')
    return viewBackground(ctx, card)
  }

  const bgs = await searchBackgrounds(escapeName(ctx.args.join(' ')).split(' ').join(' & '), 1, 100)
  if (!bgs || !bgs[0]) return ctx.responses.replyCouldNotFind('um papel de parede com esse nome')
  if (bgs.length === 1) return viewBackground(ctx, bgs[0])

  const text = bgs.map((t) => `🖼 <code>${t.id}</code>. <b>${t.name}</b>`).join('\n')
  return ctx.replyWithHTML(`🔍 <b>${bgs.length}</b> resultados encontrados:\n\n${text}\n\nPara ver um desses papéis de parede, use <code>/bg id</code>`)
}

const viewBackground = async (ctx: BotContext, bg: ProfileBackground) => {
  const img = parseImageString(bg.image, false)
  const storeListing = await findStoreItem('BACKGROUND', bg.id)

  const text = `🖼 <code>${bg.id}</code>. <b>${bg.name}</b>
<i>${storeListing?.description || 'Sem descrição.'}</i>

💰 ${storeListing?.price ? (readableNumber(storeListing.price) + ' moedas') : 'Item esgotado'}`

  const method = determineMethodToSendMedia(img)
  return ctx[method!](img, {
    caption: text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: await determineButtons(ctx, bg, storeListing)
    }
  }).catch(() => {
    return ctx.replyWithPhoto(MISSING_CARD_IMG, { caption: text, parse_mode: 'HTML' })
  })
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['background', 'header', 'banner']
}

async function determineButtons (ctx: BotContext, bg: ProfileBackground, sl: ShopItem | null) {
  const buttons: InlineKeyboardButton[][] = []

  const userOwns = await checkIfUserOwnsBackground(ctx.userData.id, bg.id)
  if (userOwns) {
    buttons.push([{
      text: '🪴 Equipar papel de parede',
      callback_data: tcqc.generateCallbackQuery('equip', { t: 'bg',id: bg.id })
    }])
  } else if (!userOwns && sl?.price && ctx.userData.coins >= sl.price) {
    buttons.push([{
      text: '💰 Comprar papel de parede',
      callback_data: tcqc.generateCallbackQuery('buy', { t: 'bg', id: bg.id })
    }])
  }

  return buttons || null
}

tcqc.add<{ t: string, id: number }>('equip', async (ctx) => {
  if (ctx.data.t === 'bg') {
    const userOwns = await checkIfUserOwnsBackground(ctx.userData.id, ctx.data.id)
    if (!userOwns) return ctx.answerCbQuery('Sinto muito, mas você não possui esse papel de parede.', { show_alert: true })
    await equipBackground(ctx.userData.id, ctx.data.id)
    return ctx.answerCbQuery('🖼️ Papel de parede equipado com sucesso!')
  } else if (ctx.data.t === 'stk') {
    const userOwns = await checkIfUserOwnsSticker(ctx.userData.id, ctx.data.id)
    if (!userOwns) return ctx.answerCbQuery('Sinto muito, mas você não possui esse sticker.', { show_alert: true })
    await equipSticker(ctx.userData.id, ctx.data.id)
    return ctx.answerCbQuery('🎟️ Sticker equipado com sucesso!')
  } else {
    return ctx.answerCbQuery('❌ Ação inválida.')
  }
})

tcqc.add<{ t: string, id: number }>('buy', async (ctx) => {
  await ctx.deleteMessage().catch(() => {})
  await ctx.answerCbQuery('🛒 Confirme a compra...').catch(() => {})
  if (ctx.data.t === 'bg') {
    ctx.args = ['bg', ctx.data.id.toString()]
    return comprar(ctx)
  } else if (ctx.data.t === 'stk') {
    ctx.args = ['sticker', ctx.data.id.toString()]
    return comprar(ctx)
  }
})
