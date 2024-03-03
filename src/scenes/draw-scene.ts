import { Telegraf, error, warning } from 'melchior'
import { Category } from '@prisma/client'
import { InlineKeyboardButton } from 'telegraf/types'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getCardFullByID } from '../utilities/engine/cards.js'
import { determineMethodToSendMedia } from '../utilities/telegram.js'

const medalMap = {
    'Comum': '🥉',
    'Raro': '🥈',
    'Lendário': '🥇'
}

const sendCard = async (ctx, card, forceImg: string | undefined = undefined, final: boolean = false) => {
  if (!card.name) return ctx.reply('Oops... parece que houve um erro. 😅\nVocê obteve um card que não existe... estranho.')
    const repeated = await _brklyn.engine.getUserTotalGivenCardAmount(ctx.userData, card)

    const tagExtra = card.tags?.[0]  ? `\n🔖 ${card.tags[0]}` : ''
    const text = `🎰 Parabéns, você ganhou e vai levar:

${medalMap[card.rarity.name]} <code>${card.id}</code>. <b>${card.name}</b>
${card.category.emoji} <i>${card.subcategory.name}</i>${tagExtra}

👾 ${ctx.from?.first_name} (${repeated || 1}x)`

    const img = forceImg || parseImageString(card.image, 'ar_3:4,c_crop') || 'https://placehold.co/400x624.png?text=Use+/setimage+id+para+trocar%20esta%20imagem.'

    const method = determineMethodToSendMedia(img)
    await ctx[method!](img, {
        caption: text,
        parse_mode: 'HTML'
    }).catch(async (e) => {
        if (final) return false
        if (e.message.includes('file identifier')) {
          error('scenes.draw', `could not send card: ${card.id} (url ${img}). msg is ${e.message}. retrying with placeholder after 5s...`)
          await sendCard(ctx, card, 'https://placehold.co/400x624.png?text=Use+/setimage+id+para+trocar%20esta%20imagem.', true)
        }
        await new Promise((r) => setTimeout(r, 5000))
        await sendCard(ctx, card)
    })
}

export default new Telegraf.Scenes.WizardScene('DRAW_SCENE', async (ctx) => {
    // if there's ctx.args[0] and the userData says the author is an admin, force the card
    // @ts-ignore
    if (ctx.scene.session.state?.argZero && ctx.scene.session.state?.user.isAdmin) {// @ts-ignore
        const card = await getCardFullByID(parseInt(ctx.scene.session.state!.argZero!))
        if (!card) {
            error('scenes.draw', 'card not found')
            return ctx.scene.leave()
        }

        await sendCard(ctx, card)
        return ctx.scene.leave()
    }

    const categories: Category[] = await _brklyn.engine.getCategories().then((res) => res.filter((cat) => cat.id !== 1))
    // inline keyboard with categories
    const keyboard = categories.map((category) => {
        return { text: category.emoji + ' ' + category.name, callback_data: `DRAW_SCENE.${category.id}` } as InlineKeyboardButton
    })
    const chunked = keyboard.chunk(2)
    const msg = await ctx.replyWithHTML('<b>ATENÇÃO: ESTE COMANDO ESTÁ EM DESENVOLVIMENTO. A FACILIDADE DE OBTER CERTAS CARTAS E POSSÍVEIS ERROS NÃO REPRESENTAM A QUALIDADE FINAL DO BOT.</b>\n\nEscolha uma categoria:', {
        reply_markup: {
            inline_keyboard: chunked
        }
    })
    // @ts-ignore
    ctx.wizard.state.msgId = msg.message_id
    return ctx.wizard.next()
}, async (ctx) => {
    // @ts-ignore
    const category = ctx.callbackQuery?.data?.split('.')[1]
    if (!category) {
        error('scenes.draw', 'category not found')
        // @ts-ignore
        await _brklyn.telegram.deleteMessage(ctx.chat?.id, ctx.wizard.state.msgId).catch((e) => {
          warning('scenes.draw', 'could not delete message: ' + e.message)
        })
        await ctx.reply('Oops... parece que houve um erro. 😅')
        return ctx.scene.leave()
    }

    const cat = await _brklyn.db.category.findUnique({ where: { id: parseInt(category) } })
    if (!cat) {
        error('scenes.draw', 'category not found')
        await ctx.reply('Oops... parece que houve um erro. 😅')
        // @ts-ignore
        await _brklyn.telegram.deleteMessage(ctx.chat?.id, ctx.wizard.state.msgId).catch((e) => warning('scenes.draw', 'could not delete message: ' + e.message))
        return ctx.scene.leave()
    }

    // @ts-ignore
    ctx.wizard.state.category = cat

    const subs = await _brklyn.engine.pickFourRandomSubcategories(cat)
    const keyboard = subs.map((sub) => {
        return { text: sub.name, callback_data: `DRAW_SCENE.${sub.id}` } as InlineKeyboardButton
    })
    const chunked = keyboard.chunk(2)

    const msg = await ctx.editMessageText('Escolha uma subcategoria:', {
        reply_markup: {
            inline_keyboard: chunked
        }
    })

    // @ts-ignore
    ctx.wizard.state.msgId = msg.message_id
    return ctx.wizard.next()
}, async (ctx) => {
    // @ts-ignore
    const subcategory = ctx.callbackQuery?.data?.split('.')[1]
    if (!subcategory) {
        error('scenes.draw', 'subcategory not found')
        // @ts-ignore
        await _brklyn.telegram.deleteMessage(ctx.chat?.id, ctx.wizard.state.msgId).catch((e) => warning('scenes.draw', 'could not delete message: ' + e.message))
        await ctx.reply('Oops... parece que houve um erro. 😅')
        return ctx.scene.leave()
    }

    const sub = await _brklyn.db.subcategory.findUnique({ where: { id: parseInt(subcategory) } })
    if (!sub) {
        error('scenes.draw', 'subcategory not found: ' + subcategory)
        await ctx.reply('Oops... parece que houve um erro. 😅')
        return ctx.scene.leave()
    }

    // @ts-ignore
    ctx.wizard.state.subcategory = sub

    // @ts-ignore
    await _brklyn.telegram.deleteMessage(ctx.chat?.id, ctx.wizard.state.msgId).catch((e) => {
      warning('scenes.draw', 'could not delete message: ' + e.message)
    })

    // @ts-ignore
    const card = await _brklyn.engine.drawCard(ctx.userData, ctx.wizard.state.category, ctx.wizard.state.subcategory)
    if (!card) {
        error('scenes.draw', 'card not found')
        // @ts-ignore
        await _brklyn.telegram.deleteMessage(ctx.chat?.id, ctx.wizard.state.msgId)
        await ctx.reply('Oops... parece que houve um erro. 😅')
        return ctx.scene.leave()
    }

    await sendCard(ctx, card)

    return ctx.scene.leave()
})
