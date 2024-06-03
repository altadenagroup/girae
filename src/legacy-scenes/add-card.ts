import { debug, error, Telegraf, warn } from 'melchior'
import { uploadAttachedPhoto } from '../utilities/telegram.js'
import { MISSING_CARD_IMG } from '../constants.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getCardByID, getCardByNameAndSubcategory } from '../utilities/engine/cards.js'
import { generate as inferCardData } from '../prompts/card-detection.js'
import { CommonMessageBundle } from 'telegraf/types'
import { Composer, Markup } from 'telegraf'
import { getCategoryByID, getCategoryByName, getOrCreateCategory } from '../utilities/engine/category.js'
import {
  getOrCreateSubcategory,
  getSubcategoryByName,
  migrateCardsToSubcategory
} from '../utilities/engine/subcategories.js'
import { getRarityByName } from '../utilities/engine/rarity.js'
import { Card, Category, Rarity, Subcategory } from '@prisma/client'
import { calculateChangesBetweenObjects, reportWithContext } from '../reporting/index.js'
import { BotContext } from '../types/context'

const raritiesEnToPt = {
  '': '',
  'Common': 'Comum',
  'Rare': 'Raro',
  'Legendary': 'Lendário'
}

// checks if there are any tags which have a subcategory
const checkIfTagsHaveSubcategory = async (tags: string[]) => {
  let tags2: string[] = []
  for (const tag of tags) {
    const sub = await getSubcategoryByName(tag, true)
    if (sub) tags2.push(tag)
  }
  return tags2
}

const generateCardView = async (cardData: any) => {
  const {
    missingSubcategory,
    missingCategory,
    mismatch
  } = await checkIfSubcategoryAndCategoryExist(cardData.subcategory, cardData.category)
  const tags = await checkIfTagsHaveSubcategory(cardData.tags || [])
  let addText = '\n'
  if (mismatch) addText += '\n<b>⚠️ A categoria da subcategoria e a categoria do card em si não batem. Isso pode ser um erro. </b>'
  if (missingSubcategory) addText += '\n<b>⚠️ A subcategoria deste card não existe. Corrija.</b>'
  if (missingCategory) addText += '\n<b>⚠️ A categoria deste card não existe. Corrija.</b>'
  // get missing tags and warn they'll become subcategories
  if (cardData.tags && tags.length < cardData.tags.length) {
    addText += `\n<b>⚠️ As seguintes tags não existem e serão transformadas em subcategorias secundárias: ${cardData.tags.filter(t => !tags.includes(t)).join(', ')}</b>`
  }
  if (cardData.image?.endsWith?.('?no_resize')) addText += '\n<b>ℹ️ Esta imagem não será redimensionada.</b>'

  const isEditing = cardData.id ? `(<i>editando card ${cardData.id}</i>)\n` : ''
  return `${isEditing}<b>Nome:</b> ${cardData.name}\n<b>Subcategoria:</b> ${cardData.subcategory}\n<b>Categoria:</b> ${cardData.category}\n<b>Raridade:</b> ${cardData.rarity}\n<b>Subcategorias secundárias (tags):</b> ${cardData.tags?.join?.(', ')}${addText}`
}

const CARD_MARKUP = Markup.inlineKeyboard([[
  Markup.button.callback('🥇', 'SWITCH_RARITY_LEGENDARY'),
  Markup.button.callback('🥈', 'SWITCH_RARITY_RARE'),
  Markup.button.callback('🥉', 'SWITCH_RARITY_COMMON')
], [
  Markup.button.callback('📂 Subcategoria', 'EDIT_SUBCATEGORY'),
  Markup.button.callback('🏷️ Tags', 'EDIT_TAGS'),
  Markup.button.callback('📓 Nome', 'EDIT_NAME'),
  Markup.button.callback('📁 Categoria', 'EDIT_CATEGORY')
], [
  Markup.button.callback('🚫 Não redimensionar imagem', 'DO_NOT_RESIZE_CARD')
], [
  Markup.button.callback('✅ Confirmar', 'CONFIRM_ADD_CARD')
], [
  Markup.button.callback('❌ Cancelar', 'CANCEL_ADD_CARD')
]]).reply_markup

const composer = new Composer()
composer.action('SWITCH_RARITY_LEGENDARY', async (ctx) => {
  // @ts-ignore
  ctx.wizard.state.cardData.rarity = 'Legendary'
  // @ts-ignore
  await updateCardView(ctx)
})

composer.action('SWITCH_RARITY_RARE', async (ctx) => {
  // @ts-ignore
  ctx.wizard.state.cardData.rarity = 'Rare'
  // @ts-ignore
  await updateCardView(ctx)
})

composer.action('SWITCH_RARITY_COMMON', async (ctx) => {
  // @ts-ignore
  ctx.wizard.state.cardData.rarity = 'Common'
  // @ts-ignore
  await updateCardView(ctx)
})

composer.action('CONFIRM_ADD_CARD', async (ctx) => {
  // @ts-ignore
  const cardData = ctx.wizard.state.cardData
  const category = await getOrCreateCategory(cardData.category)
  const subcategory = await getOrCreateSubcategory(cardData.subcategory, category.id)
  const rarity = await getRarityByName(raritiesEnToPt[cardData.rarity] || cardData.rarity)
  if (!category || !subcategory || !rarity) {
    await ctx.reply('Não foi possível modificar o card.')
    // @ts-ignore
    return ctx.scene.leave()
  }

  if (cardData.id) {
    const ogCard = await getCardByID(cardData.id)
    await _brklyn.db.card.update({
      where: {
        id: cardData.id
      },
      data: {
        name: cardData.name,
        image: cardData.image,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        rarityId: rarity.id,
        tags: cardData.tags || []
      }
    })

    if (cardData.tags) {
      for (const tag of cardData.tags) {
        await migrateCardsToSubcategory(tag)
      }
    }

    await reportWithContext(ctx as unknown as BotContext, 'EDIÇÃO_DE_CARD', {
      cardID: cardData.id,
      name: cardData.name,
      rarityName: cardData.rarity,
      categoryEmoji: category.emoji
    }, calculateChangesBetweenObjects(ogCard!, cardData))

    await ctx.reply('Card atualizado com sucesso.')
    // @ts-ignore
    await _brklyn.telegram.deleteMessage(ctx.chat?.id, ctx.wizard.state.messageId).catch((e) => {
      error('scenes.addCard', `could not delete message: ${e.stack}`)
    })
    // @ts-ignore
    return ctx.scene.leave()
  }

  const r = await _brklyn.db.card.create({
    data: {
      name: cardData.name,
      image: cardData.image,
      categoryId: category.id,
      subcategoryId: subcategory.id,
      rarityId: rarity.id,
      rarityModifier: 0,
      tags: cardData.tags || []
    }
  })

  if (cardData.tags) {
    for (const tag of cardData.tags) {
      await migrateCardsToSubcategory(tag)
    }
  }

  await reportWithContext(ctx as unknown as BotContext, 'ADIÇÃO_DE_CARD', {
    cardID: r.id,
    name: cardData.name,
    rarityName: cardData.rarity,
    categoryEmoji: category.emoji
  })

  await ctx.reply('Card adicionado com sucesso.')
  // @ts-ignore
  await _brklyn.telegram.deleteMessage(ctx.chat?.id, ctx.wizard.state.messageId).catch((e) => {
    error('scenes.addCard', `could not delete message: ${e.stack}`)
  })
  // @ts-ignore
  return ctx.scene.leave()
})

composer.action('CANCEL_ADD_CARD', async (ctx) => {
  await ctx.reply('Adição de card cancelada.')
  // @ts-ignore
  await _brklyn.telegram.deleteMessage(ctx.chat?.id, ctx.wizard.state.messageId)
  // @ts-ignore
  return ctx.scene.leave()
})

composer.action('DO_NOT_RESIZE_CARD', async (ctx) => {
  // @ts-ignore
  ctx.wizard.state.cardData.image = ctx.wizard.state.cardData.image + '?no_resize'
  await ctx.reply('Imagem não será redimensionada.')
})

composer.action('EDIT_SUBCATEGORY', async (ctx) => {
  await ctx.reply('Envie a nova subcategoria.')
  // @ts-ignore
  ctx.wizard.state.editingSubcategory = true
  // @ts-ignore
  return ctx.wizard.next()
})

composer.action('EDIT_TAGS', async (ctx) => {
  // @ts-ignore
  await ctx.replyWithHTML(`Envie as novas tags separadas por vírgula.\n\nAtualmente: <Code>${ctx.wizard.state.cardData.tags?.join?.(', ') || 'nenhuma'}</code>\n\nVocê também pode mandar <code>limpar</code> para apagar as tags de um card.`)
  // @ts-ignore
  ctx.wizard.state.editingTags = true
  // @ts-ignore
  return ctx.wizard.next()
})

composer.action('EDIT_NAME', async (ctx) => {
  // @ts-ignore
  await ctx.reply('Envie o novo nome.')
  // @ts-ignore
  ctx.wizard.state.editingName = true
  // @ts-ignore
  return ctx.wizard.next()
})

composer.action('EDIT_CATEGORY', async (ctx) => {
  // @ts-ignore
  await ctx.reply('Envie a nova categoria.')
  // @ts-ignore
  ctx.wizard.state.editingCategory = true
  // @ts-ignore
  return ctx.wizard.next()
})

export default new Telegraf.Scenes.WizardScene('ADD_CARD_SCENE', async (ctx) => {
  // if there's a card in the scenes session opt, mark this session as editing
  let editing = false
  let skipAI = false
  // @ts-ignore
  if (ctx.scene.session.state?.editCard) {
    const card = (ctx.scene.session.state as any).editCard as (Card & {
      category: Category,
      subcategory: Subcategory,
      rarity: Rarity
    })
    // @ts-ignore
    editing = true
    // @ts-ignore
    ctx.wizard.state.cardData = {
      id: card.id,
      name: card.name,
      subcategory: card.subcategory.name,
      category: card.category.name,
      rarity: card.rarity.name,
      tags: card.tags,
      image: card.image
    }
  }
  // @ts-ignore
  if (ctx.scene.session.state?.name) {
    skipAI = true
    // @ts-ignore
    const cat = await getCategoryByID(ctx.scene.session.state.category)
    // @ts-ignore
    ctx.wizard.state.cardData = {
      // @ts-ignore
      name: ctx.scene.session.state.name,
      // @ts-ignore
      subcategory: ctx.scene.session.state.subcategory,
      category: cat.name,
      // @ts-ignore
      rarity: ctx.scene.session.state.rarity,
      // @ts-ignore
      tags: ctx.scene.session.state.tags
    }
  }

  // @ts-ignore
  if (!editing && !ctx.message?.reply_to_message) {
    await ctx.reply('Você precisa responder a uma mensagem para adicionar um card.')
    return ctx.scene.leave()
  }
  // @ts-ignore
  const message = (ctx.message as CommonMessageBundle).reply_to_message?.text || (ctx.message as CommonMessageBundle).reply_to_message?.caption

  // get any photos from the message
  // @ts-ignore
  let imgString = await uploadAttachedPhoto(ctx, true)

  if (editing && imgString) {
    // @ts-ignore
    ctx.wizard.state.cardData.image = imgString
  }
  // infer the card data

  // @ts-ignore
  const cardData = (!editing && !skipAI) ? await inferCardData(message) : ctx.wizard.state.cardData
  if (!cardData) {
    await ctx.reply('Não foi possível inferir os dados do card.')
    return ctx.scene.leave()
  }

  if (cardData.error) {
    await ctx.reply(`${cardData.error}`)
    return ctx.scene.leave()
  }

  const exists = editing ? false : await getCardByNameAndSubcategory(cardData.name, cardData.subcategory)
  if (cardData.image) imgString = cardData.image
  if (!cardData.tags) cardData.tags = []
  cardData.tags = cardData.tags.filter(a => a)

  const img = imgString ? parseImageString(imgString as string) : MISSING_CARD_IMG
  debug('scenes.addCard', `imgString: ${imgString}, img: ${img}`)

  // @ts-ignore
  if (!editing) ctx.wizard.state.cardData = { ...cardData, image: imgString }
  // @ts-ignore
  if (ctx.scene.session.state?.noResize) ctx.wizard.state.cardData.image = ctx.wizard.state.cardData.image + '?no_resize'
  // @ts-ignore
  cardData.image = ctx.wizard.state.cardData.image

  const text = await generateCardView(cardData)

  // send card data and markup: one row contains medals to change the card rarity, the other contains a confirm button and a cancel button
  const m = await ctx.replyWithPhoto(img, {
    caption: text + (exists ? '\n\n<b>⚠️ Este card já existe, aparentemente. Confirme antes de upar.</b>' : ''),
    parse_mode: 'HTML', reply_markup: CARD_MARKUP
  })

  // @ts-ignore
  ctx.wizard.state.messageId = m.message_id
  // @ts-ignore
  ctx.wizard.state.chatId = ctx.chat?.id
  return ctx.wizard.next()
}, composer, async (ctx) => {
  // @ts-ignore
  if (!ctx.message?.text) return ctx.reply('Envie um texto.')
  // @ts-ignore
  if (ctx.wizard.state.editingSubcategory) {
    // @ts-ignore regex to replace k-pop or kpop to K-Pop
    ctx.wizard.state.cardData.subcategory = ctx.message.text
      .replace(/k-?pop/i, 'K-Pop')
      .replace(/j-?pop/i, 'J-Pop')
    await updateCardView(ctx)
    // @ts-ignore
    ctx.wizard.state.editingSubcategory = false
  }
  // @ts-ignore
  if (ctx.wizard.state.editingTags) {
    // @ts-ignore
    ctx.wizard.state.cardData.tags = ctx.message.text === 'limpar' ? [] : ctx.message.text.split(',').map(t => t.trim())
    await updateCardView(ctx)
    // @ts-ignore
    ctx.wizard.state.editingTags = false
  }
  // @ts-ignore
  if (ctx.wizard.state.editingName) {
    // @ts-ignore
    ctx.wizard.state.cardData.name = ctx.message.text
    await updateCardView(ctx)
    // @ts-ignore
    ctx.wizard.state.editingName = false
  }
  // @ts-ignore
  if (ctx.wizard.state.editingCategory) {
    // @ts-ignore
    ctx.wizard.state.cardData.category = ctx.message.text
      .replace(/k-?pop/i, 'K-POP')
    await updateCardView(ctx)
    // @ts-ignore
    ctx.wizard.state.editingCategory = false
  }
  return ctx.wizard.back()
})

const updateCardView = async (ctx) => {
  const text = await generateCardView(ctx.wizard.state.cardData)
  const shouldRemoveConfirm = text.includes('Corrija')
  // @is-ignore
  return _brklyn.telegram.editMessageCaption(ctx.chat?.id, ctx.wizard.state.messageId, undefined, text, {
    parse_mode: 'HTML',
    reply_markup: !shouldRemoveConfirm ? CARD_MARKUP : { inline_keyboard: CARD_MARKUP.inline_keyboard.filter((row) => row[0].text !== '✅ Confirmar') }
  }).catch(async (e) => {
    warn('scenes.addCard', `could not edit message: ${e.message}`)
    await ctx.reply('Não foi possível editar a mensagem. Tente novamente? Volte ao card e salve-o ou cancele-o.')
    return false
  })
}

const checkIfSubcategoryAndCategoryExist = async (subcategory, category) => {
  let has = { missingSubcategory: false, missingCategory: false, mismatch: false }
  const sub = await getSubcategoryByName(subcategory)
  if (!sub) has.missingSubcategory = true

  const cat = await getCategoryByName(category)
  if (!cat) has.missingCategory = true
  if (has.missingSubcategory || has.missingCategory) return has

  if (sub.categoryId !== cat.id) has.mismatch = true
  return has
}
