import { Telegraf, error } from 'melchior'
import { InlineKeyboardButton } from 'telegraf/types'
import { Card, Category, Rarity } from '@prisma/client'

interface State {
    msgId: number
    categories: Category[]
    cards: Card[]
    cardsOnSubcategory: ModCard[]
    ordering: Ordering
    subcategory: string
}

interface ModCard extends Card {
    count: number
    rarity: Rarity
}

const closeBtn = { text: '❌ Fechar', callback_data: 'SHOW_USER_CARDS.CLOSE' } as InlineKeyboardButton
const backBtn = { text: '🔙 Voltar', callback_data: 'SHOW_USER_CARDS.BACK' } as InlineKeyboardButton

enum Ordering {
    R_TO_C = 'Das cartas lendárias para as comuns',
    C_TO_R = 'Das cartas comuns para as lendárias'
}

const rarityMap = {
    'Comum': '🥉',
    'Raro': '🥈',
    'Lendário': '🥇'
}

const cardMapFn = (card: ModCard) => `<code>${card.id}</code>. ${rarityMap[card.rarity.name]} <b>${card.name}</b> <i>(${card.count}x)</i>`

const generateText = (state: State) => {
    const cards = state.cardsOnSubcategory
    const text = `Você tem <b>${cards.length}</b> cartas nessa subcategoria! 🤩
 
 ${cards.map(cardMapFn).join('\n')}

Escolha uma ordem para ver as cartas...`
    return text
}

const subCat = async (ctx) => {
    // @ts-ignore
    const subcategory = ctx.wizard.state.manualCallback?.split('.')[1] || ctx.callbackQuery?.data?.split('.')[2] || ctx.callbackQuery?.data?.split('.')[1]
    if (!subcategory) {
        error('scenes.showUserCards', 'subcategory not found')
        return ctx.scene.leave()
    }

    if (subcategory === 'CLOSE') {
        await _brklyn.telegram.deleteMessage(ctx.chat?.id, (ctx.wizard.state as State).msgId)
        return ctx.scene.leave()
    }

    if (subcategory === 'BACK') {
        const chunked = [...(ctx.wizard.state as State).categories.map((category) => {
            return { text: category.emoji + ' ' + category.name, callback_data: `SHOW_USER_CARDS.${category.id}` } as InlineKeyboardButton
        }).chunk(2), [closeBtn]]
        await _brklyn.telegram.editMessageText(ctx.chat?.id, (ctx.wizard.state as State).msgId, undefined, `Você tem <b>${(ctx.wizard.state as State).cards.length}</b> cartas! 🤩\nEscolha uma categoria...`, {
            reply_markup: {
                inline_keyboard: chunked
            },
            parse_mode: 'HTML'
        })
        return ctx.wizard.back()
    }

    // @ts-ignore
    ctx.wizard.state.subcategory = subcategory

    const rarities = await _brklyn.engine.getRarities()

    const cardsOnSubcategory = (ctx.wizard.state as State).cards.filter((card) => card.subcategoryId === parseInt((ctx.wizard.state as State).subcategory))
    if (cardsOnSubcategory.length === 0) {
        await _brklyn.telegram.editMessageText(ctx.chat?.id, (ctx.wizard.state as State).msgId, undefined, 'Você não tem nenhuma carta dessa subcategoria. 😢', {
            reply_markup: {
                inline_keyboard: [[backBtn, closeBtn]]
            }
        })
        return ctx.wizard.back()
    }

    // users can have multiple cards of the same type, so we need to add a count to each card and remove duplicates.
    const cardsWithCount = cardsOnSubcategory.map((card) => {
        return {
            ...card,
            count: cardsOnSubcategory.filter((c) => c.id === card.id).length,
            rarity: rarities.find((r) => r.id === card.rarityId)
        }
    }).filter((card, index, self) => self.findIndex((c) => c.id === card.id) === index)

    // @ts-ignore
    ctx.wizard.state.cardsOnSubcategory = cardsWithCount
    // @ts-ignore
    ctx.wizard.state.ordering = ctx.wizard.state.ordering ?? Ordering.R_TO_C

    const text = generateText(ctx.wizard.state as State)

    const chunked = [
        [{ text: Ordering.R_TO_C, callback_data: 'SHOW_USER_CARDS.R_TO_C' }, { text: Ordering.C_TO_R, callback_data: 'SHOW_USER_CARDS.C_TO_R' }],
        [backBtn, closeBtn]
    ]

    await _brklyn.telegram.editMessageText(ctx.chat?.id, (ctx.wizard.state as State).msgId, undefined, text, {
        reply_markup: {
            inline_keyboard: chunked
        },
        parse_mode: 'HTML'
    })

    return ctx.wizard.next()
}

export default new Telegraf.Scenes.WizardScene('SHOW_USER_CARDS', async (ctx) => {
    // @ts-ignore
    const cards = await _brklyn.engine.getUserCards(ctx.userData)
    if (cards.length === 0) {
        return ctx.reply('Você ainda não tem nenhum card. 😢')
    }
    // @ts-ignore
    ctx.wizard.state.cards = cards

    const categories = await _brklyn.engine.getCategories()
    // @ts-ignore
    ctx.wizard.state.categories = categories
    const catKeyboard = categories.map((category) => {
        return { text: category.emoji + ' ' + category.name, callback_data: `SHOW_USER_CARDS.${category.id}` } as InlineKeyboardButton
    })

    const chunked = [...catKeyboard.chunk(2), [closeBtn]]

    const m = await ctx.replyWithHTML(`Você tem <b>${cards.length}</b> cartas! 🤩\nEscolha uma categoria...`, {
        reply_markup: {
            inline_keyboard: chunked
        }
    })

    // @ts-ignore
    ctx.wizard.state.msgId = m.message_id
    return ctx.wizard.next()
}, async (ctx) => {
    // @ts-ignore
    const category = ctx.callbackQuery?.data?.split('.')[1]
    if (!category) {
        error('scenes.showUserCards', 'category not found')
        return ctx.scene.leave()
    }

    if (category === 'CLOSE') {
        await _brklyn.telegram.deleteMessage(ctx.chat?.id, (ctx.wizard.state as State).msgId)
        return ctx.scene.leave()
    }

    const cardsOnCategory = (ctx.wizard.state as State).cards.filter((card) => card.categoryId === parseInt(category))
    if (cardsOnCategory.length === 0) {
        await _brklyn.telegram.editMessageText(ctx.chat?.id, (ctx.wizard.state as State).msgId, undefined, 'Você não tem nenhuma carta dessa categoria. 😢', {
            reply_markup: {
                inline_keyboard: [[backBtn, closeBtn]]
            }
        })
        return ctx.wizard.back()
    }

    // users can have multiple cards of the same type, so we need to add a count to each card and remove duplicates.
    const cardsWithCount = cardsOnCategory.map((card) => {
        return {
            ...card,
            count: cardsOnCategory.filter((c) => c.id === card.id).length
        }
    }).filter((card, index, self) => self.findIndex((c) => c.id === card.id) === index)
    // the bigger the rarityId, the rarer the card.
    const sortedByRarity = cardsWithCount.sort((a, b) => b.rarityId - a.rarityId)
    const top3 = sortedByRarity.slice(0, 3)

    const text = `Você tem <b>${cardsOnCategory.length}</b> cartas nessa categoria! 🤩
Top 3 mais raras: ${top3.map((card) => `<b>${card.name}</b> <i>${card.count}x</i>`).join(', ')}

Para ver todas, selecione uma subcategoria...`
    
    const subcategories = await _brklyn.engine.getSubcategoriesByCategory(category)
    const subKeyboard = subcategories.map((sub) => {
        return { text: sub.name, callback_data: `SHOW_USER_CARDS.${category}.${sub.id}` } as InlineKeyboardButton
    })
    const chunked = [...subKeyboard.chunk(2), [backBtn, closeBtn]]
    
    await _brklyn.telegram.editMessageText(ctx.chat?.id, (ctx.wizard.state as State).msgId, undefined, text, {
        reply_markup: {
            inline_keyboard: chunked
        },
        parse_mode: 'HTML'
    })
    
    return ctx.wizard.next()
}, subCat, async (ctx) => {
    // @ts-ignore
    const category = ctx.callbackQuery?.data?.split('.')[1]
    if (!category) {
        error('scenes.showUserCards', 'category not found')
        return ctx.scene.leave()
    }

    if (category === 'CLOSE') {
        await _brklyn.telegram.deleteMessage(ctx.chat?.id, (ctx.wizard.state as State).msgId)
        return ctx.scene.leave()
    }

    if (category === 'BACK') {
        // go back to the category selection
        const chunked = [...(ctx.wizard.state as State).categories.map((category) => {
            return { text: category.emoji + ' ' + category.name, callback_data: `SHOW_USER_CARDS.${category.id}` } as InlineKeyboardButton
        }).chunk(2), [closeBtn]]

        await _brklyn.telegram.editMessageText(ctx.chat?.id, (ctx.wizard.state as State).msgId, undefined, `Você tem <b>${(ctx.wizard.state as State).cards.length}</b> cartas! 🤩\nEscolha uma categoria...`, {
            reply_markup: {
                inline_keyboard: chunked
            },
            parse_mode: 'HTML'
        })

        return ctx.wizard.selectStep(1)
    }

    // handle order change
    if (category === 'R_TO_C' || category === 'C_TO_R') {
        // @ts-ignore
        ctx.wizard.state.ordering = category === 'R_TO_C' ? Ordering.R_TO_C : Ordering.C_TO_R
        // @ts-ignore
        ctx.wizard.state.manualCallback = `SHOW_USER_CARDS.${(ctx.wizard.state as State).subcategory}`
        await subCat(ctx)
        return ctx.wizard.back()
    }

    return ctx.scene.leave()
})