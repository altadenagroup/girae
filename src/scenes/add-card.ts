import { Telegraf, error } from 'melchior'
import cloudinary from 'cloudinary'
import { generatePhotoLink } from '../utilities/telegram.js'
import { MISSING_CARD_IMG } from '../constants.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getCardByNameAndSubcategory } from '../utilities/engine/cards.js'
import { generate as inferCardData } from '../prompts/card-detection.js'
import { CommonMessageBundle } from 'telegraf/types'
import { Composer, Markup } from 'telegraf'
import { getOrCreateCategory } from '../utilities/engine/category.js'
import { getOrCreateSubcategory } from '../utilities/engine/subcategories.js'
import { getRarityByName } from '../utilities/engine/rarity.js'

const raritiesEnToPt = {
  'Common': 'Comum',
  'Rare': 'Raro',
  'Legendary': 'Lendário'
}

const generateCardView = (cardData: any) => {
  return `<b>Nome:</b> ${cardData.name}\n<b>Subcategoria:</b> ${cardData.subcategory}\n<b>Categoria:</b> ${cardData.category}\n<b>Raridade:</b> ${cardData.rarity}\n<b>Tags:</b> ${cardData.tags.join(', ')}`
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
  Markup.button.callback('✅ Confirmar', 'CONFIRM_ADD_CARD'),
], [
  Markup.button.callback('❌ Cancelar', 'CANCEL_ADD_CARD')
]]).reply_markup

const composer = new Composer()
composer.action('SWITCH_RARITY_LEGENDARY', async (ctx) => {
  // @ts-ignore
  ctx.wizard.state.cardData.rarity = 'Lengendary'
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
  const rarity = await getRarityByName(raritiesEnToPt[cardData.rarity])

  await _brklyn.db.card.create({
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

  await ctx.reply('Card adicionado com sucesso.')
  // @ts-ignore
  await _brklyn.telegram.deleteMessage(ctx.chat?.id, ctx.wizard.state.messageId)
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

composer.action('EDIT_SUBCATEGORY', async (ctx) => {
  await ctx.reply('Envie a nova subcategoria.')
  // @ts-ignore
  ctx.wizard.state.editingSubcategory = true
  // @ts-ignore
  return ctx.wizard.next()
})

composer.action('EDIT_TAGS', async (ctx) => {
  // @ts-ignore
  await ctx.replyWithHTML(`Envie as novas tags separadas por vírgula.\n\nAtualmente: <Code>${ctx.wizard.state.cardData.tags?.join?.(', ') || 'nenhuma'}</code>`)
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
  // @ts-ignore
  if (!ctx.message?.reply_to_message) {
    await ctx.reply('Você precisa responder a uma mensagem para adicionar um card.')
    return ctx.scene.leave()
  }
  // @ts-ignore
  const message = (ctx.message as CommonMessageBundle).reply_to_message!.text || (ctx.message as CommonMessageBundle).reply_to_message!.caption

  // get any photos from the message
  // @ts-ignore
  const photos = (ctx.message as CommonMessageBundle).reply_to_message.photo
  const photo = photos?.[0] ? photos[photos.length - 1].file_id : null
  let imgString
  if (photo) {
    const link = await generatePhotoLink(photo)
    if (link) {
      const r = await cloudinary.v2.uploader.upload(link).catch((e) => {
        console.error(e)
        return null
      })
      if (r) imgString = `id:${r.public_id}`
    } else {
      await ctx.reply('Não foi possível obter o link da foto.')
    }
  }
  // infer the card data
  const cardData = await inferCardData(message)
  if (!cardData) return ctx.reply('Não foi possível inferir os dados do card.')
  const exists = await getCardByNameAndSubcategory(cardData.name, cardData.subcategory)
  if (exists) return ctx.reply('Já existe um card com esse nome e subcategoria.')
  if (cardData.image) imgString = cardData.image

  const img = imgString ? parseImageString(imgString) : MISSING_CARD_IMG
  const text = `<b>Nome:</b> ${cardData.name}\n<b>Subcategoria:</b> ${cardData.subcategory}\n<b>Categoria:</b> ${cardData.category}\n<b>Raridade:</b> ${cardData.rarity}\n<b>Tags:</b> ${cardData.tags.join(', ')}`

  // @ts-ignore
  ctx.wizard.state.cardData = { ...cardData, image: imgString }

  // send card data and markup: one row contains medals to change the card rarity, the other contains a confirm button and a cancel button
  const m = await ctx.replyWithPhoto(img, {
    caption: text,
    parse_mode: 'HTML', reply_markup: CARD_MARKUP
  })

  // @ts-ignore
  ctx.wizard.state.messageId = m.message_id
  // @ts-ignore
  ctx.wizard.state.chatId = ctx.chat?.id
  return ctx.wizard.next()
}, composer, async (ctx) => {
  // @ts-ignore
  if (ctx.wizard.state.editingSubcategory) {
    // @ts-ignore
    ctx.wizard.state.cardData.subcategory = ctx.message.text
    await updateCardView(ctx)
    // @ts-ignore
    ctx.wizard.state.editingSubcategory = false
  }
  // @ts-ignore
  if (ctx.wizard.state.editingTags) {
    // @ts-ignore
    ctx.wizard.state.cardData.tags = ctx.message.text.split(',').map(t => t.trim())
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
    await updateCardView(ctx)
    // @ts-ignore
    ctx.wizard.state.editingCategory = false
  }
  return ctx.wizard.back()
})

const updateCardView = (ctx) => {
  // @is-ignore
  return _brklyn.telegram.editMessageCaption(ctx.chat?.id, ctx.wizard.state.messageId, undefined, generateCardView(ctx.wizard.state.cardData), {
    parse_mode: 'HTML',
    reply_markup: CARD_MARKUP
  }).catch(async (e) => {
    error('scenes.addCard', `could not edit message: ${e.stack}`)
    await ctx.reply('Não foi possível editar a mensagem. Tente novamente? Volte ao card e salve-o ou cancele-o.')
    return false
  })
}
