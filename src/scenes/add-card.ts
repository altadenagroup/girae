import { Telegraf } from 'melchior'
import cloudinary from 'cloudinary'
import { generatePhotoLink } from '../utilities/telegram.js'
import { MISSING_CARD_IMG } from '../constants.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getCardByNameAndSubcategory } from '../utilities/engine/cards.js'
import { generate as inferCardData } from '../prompts/card-detection.js'
import { CommonMessageBundle } from 'telegraf/types'
import { Composer } from 'telegraf'
import { getOrCreateCategory } from '../utilities/engine/category.js'
import { getOrCreateSubcategory } from '../utilities/engine/subcategories.js'
import { getRarityByName } from '../utilities/engine/rarity.js'

const raritiesEnToPt = {
  'Common': 'Comum',
  'Rare': 'Raro',
  'Legendary': 'Lendário'
}

const composer = new Composer()
composer.action('SWITCH_RARITY_LEGENDARY', async (ctx) => {
  // @ts-ignore
  ctx.wizard.state.cardData.rarity = 'Lengendary'
  // @ts-ignore
  const m = await ctx.editMessageCaption(ctx.wizard.state.messageId, ctx.callbackQuery.message.message_id, null, ctx.callbackQuery.message.caption + '\n\nRaridade alterada para lendária.')
  // @ts-ignore
  ctx.wizard.state.messageId = m.message_id
})

composer.action('SWITCH_RARITY_RARE', async (ctx) => {
  // @ts-ignore
  ctx.wizard.state.cardData.rarity = 'Rare'
  // @ts-ignore
  const m = await ctx.editMessageCaption(ctx.wizard.state.messageId, ctx.callbackQuery.message.message_id, null, ctx.callbackQuery.message.caption + '\n\nRaridade alterada para rara.')
  // @ts-ignore
  ctx.wizard.state.messageId = m.message_id
})

composer.action('SWITCH_RARITY_COMMON', async (ctx) => {
  // @ts-ignore
  ctx.wizard.state.cardData.rarity = 'Common'
  // @ts-ignore
  const m = await ctx.editMessageCaption(ctx.wizard.state.messageId, ctx.callbackQuery.message.message_id, null, ctx.callbackQuery.message.caption + '\n\nRaridade alterada para comum.')
  // @ts-ignore
  ctx.wizard.state.messageId = m.message_id
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

export default new Telegraf.Scenes.WizardScene('ADD_CARD_SCENE', async (ctx) => {
  // @ts-ignore
  const message = (ctx.message as CommonMessageBundle).reply_to_message!.text || (ctx.message as CommonMessageBundle).reply_to_message!.caption

  // get any photos from the message
  // @ts-ignore
  const photos = (ctx.message as CommonMessageBundle).reply_to_message.photo
  const photo = photos ? photos[photos.length - 1].file_id : null
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

  const img = imgString ? parseImageString(imgString) : MISSING_CARD_IMG
  const text = `<b>Nome:</b> ${cardData.name}\n<b>Subcategoria:</b> ${cardData.subcategory}\n<b>Categoria:</b> ${cardData.category}\n<b>Raridade:</b> ${cardData.rarity}\n<b>Tags:</b> ${cardData.tags.join(', ')}`

  // @ts-ignore
  ctx.wizard.state.cardData = { ...cardData, image: imgString }

  // send card data and markup: one row contains medals to change the card rarity, the other contains a confirm button and a cancel button
  const m = await ctx.replyWithPhoto(img, { caption: text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [
    [{ text: '🥇', callback_data: 'SWITCH_RARITY_LEGENDARY' }, { text: '🥈', callback_data: 'SWITCH_RARITY_RARE' }, { text: '🥉', callback_data: 'SWITCH_RARITY_COMMON' }],
    [{ text: '✅ Confirmar', callback_data: 'CONFIRM_ADD_CARD' }],
    [{ text: '❌ Cancelar', callback_data: 'CANCEL_ADD_CARD' }]
  ]}})

  // @ts-ignore
  ctx.wizard.state.messageId = m.message_id
  return ctx.wizard.next()
}, composer)
