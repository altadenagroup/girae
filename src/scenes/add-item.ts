import { User } from 'telegraf/types.js'
import { SessionContext } from '../sessions/context.js'
import { AdvancedScene } from '../sessions/scene.js'
import { generateID, readableNumber } from '../utilities/misc.js'
import { ItemType } from '@prisma/client'
import { reportWithContext } from '../reporting/index.js'

interface ItemData {
  name: string
  description: string
  fileLink: string
  type: ItemType
  price: number
  editing: boolean
  id?: number
  shopItemID?: number

  expecting?: 'NAME' | 'DESCRIPTION' | 'PRICE' | null
}

const typeToEmoji: Record<ItemType, string> = {
  'BACKGROUND': '🖼',
  'STICKER': '🎨',
  'DRAWS': '🎡',
  'MARRIAGE_RING': '💍'
}

const creationButtons = [
  [{ text: '✅ Criar', callback_data: 'CREATE' }, { text: '❌ Cancelar', callback_data: 'CANCEL' }]
]

const editionButtons = [
  [
    { text: '📑 Nome', callback_data: 'NAME' },
    { text: '📓 Descrição', callback_data: 'DESCRIPTION' },
    { text: '💰 Preço', callback_data: 'PRICE' }
  ],
  [{ text: '✅ Salvar', callback_data: 'SAVE' }, { text: '❌ Cancelar', callback_data: 'CANCEL' }]
]

const editingText = (ctx) => `Editando ${typeToEmoji[ctx.session.data.type]} <code>${ctx.session.data.id}</code>. <b>${ctx.session.data.name}</b>\n\n<i>${ctx.session.data.description}</i>\n\n💰 ${readableNumber(ctx.session.data.price)} moedas\n\nEdite o item usando os botões abaixo.`
const editSentMessage = (ctx) => ctx.session.editMainMessageCaption(editingText(ctx), {
  reply_markup: {
    inline_keyboard: editionButtons
  },
  parse_mode: 'HTML'
})

const prefixed = (a) => a.startsWith('url:') || a.startsWith('id') ? a : `url:${a}`
export const generateUserProfile = async (ctx: SessionContext<ItemData>, addPreviewOverlay: boolean = false) => {
  switch (ctx.session.data.type) {
    case 'BACKGROUND':
      // @ts-ignore
      ctx.profileData.background = { image: prefixed(ctx.session.data.fileLink) }
      break
    case 'STICKER':
      // @ts-ignore
      ctx.profileData.stickers = { image: prefixed(ctx.session.data.fileLink) }
      break
    default:
      break
  }

  // @ts-ignore
  const dittoData = await _brklyn.ditto.generateProfile(ctx.userData, ctx.profileData, null, ctx.from as User, addPreviewOverlay)
  return dittoData?.url
}

const saveItem = async (ctx: SessionContext<ItemData>) => {
  const updateData = {
    name: ctx.session.data.name
  }

  const shopUpdateData = {
    name: ctx.session.data.name,
    description: ctx.session.data.description,
    price: ctx.session.data.price
  }

  ctx.session.steps.leave()
  await ctx.session.deleteMainMessage()

  await _brklyn.db.shopItem.update({
    where: {
      id: ctx.session.data.shopItemID
    },
    data: shopUpdateData
  })

  switch (ctx.session.data.type) {
    case 'BACKGROUND':
      await _brklyn.db.profileBackground.update({
        where: {
          id: ctx.session.data.id
        },
        data: updateData
      })
      await reportWithContext(ctx, 'EDIÇÃO_DE_PAPEL_DE_PAREDE', { backgroundImageID: ctx.session.data.id!, name: ctx.session.data.name }, { field: 'name', oldValue: ctx.session.data.name, newValue: ctx.session.data.name })
      break
    case 'STICKER':
      await _brklyn.db.profileSticker.update({
        where: {
          id: ctx.session.data.id
        },
        data: updateData
      })
      await reportWithContext(ctx, 'EDIÇÃO_DE_STICKER', { stickerID: ctx.session.data.id!, name: ctx.session.data.name }, { field: 'name', oldValue: ctx.session.data.name, newValue: ctx.session.data.name })
      break
    default:
      break
  }

  return ctx.replyWithHTML(`Item <code>${ctx.session.data.id}</code> atualizado com sucesso.`)
}

const firstStep = async (ctx: SessionContext<ItemData>) => {
  const name = ctx.session.arguments!.name as string
  const description = ctx.session.arguments!.description as string
  const fileID = ctx.session.arguments!.file as string
  const type = ctx.session.arguments!.type as ItemType
  const price = ctx.session.arguments!.price as number
  const editing = ctx.session.arguments!.editing as boolean
  const id = ctx.session.arguments!.id as number
  const shopItemID = ctx.session.arguments!.shopItemID as number

  ctx.session.setMessageToBeQuoted(ctx.message?.message_id)
  ctx.session.data.name = name
  ctx.session.data.description = description
  ctx.session.data.fileLink = fileID
  ctx.session.data.type = type
  ctx.session.data.price = price
  ctx.session.data.editing = editing
  ctx.session.data.id = id
  ctx.session.data.shopItemID = shopItemID

  const profileURL = await generateUserProfile(ctx)
  ctx.session.steps.next()

  return ctx.replyWithPhoto(profileURL || fileID, {
    caption: editing
      ? editingText(ctx)
      : `Criando ${typeToEmoji[type]} <b>${name}</b>\n\n<i>${description}</i>\n\n💰 ${readableNumber(price)} moedas\n\nConfirme a criação do item clicando nos botões abaixo.`,
    reply_markup: {
      inline_keyboard: editing ? editionButtons : creationButtons
    },
    parse_mode: 'HTML'
  }).then((t) => ctx.session.setMainMessage(t.message_id))
}

const secondStep = async (ctx: SessionContext<ItemData>) => {
  if (ctx.callbackQuery?.data === 'CANCEL') {
    ctx.session.steps.leave()
    await ctx.session.deleteMainMessage()
    return ctx.reply('Operação cancelada.')
  }

  if (ctx.callbackQuery?.data === 'CREATE') return createItem(ctx)

  if (ctx.callbackQuery?.data) {
    await ctx.answerCbQuery()
    switch (ctx.callbackQuery.data) {
      case 'NAME':
        ctx.session.data.expecting = 'NAME'
        return ctx.reply('Digite o novo nome do item.')
      case 'DESCRIPTION':
        ctx.session.data.expecting = 'DESCRIPTION'
        return ctx.reply('Digite a nova descrição do item.')
      case 'PRICE':
        ctx.session.data.expecting = 'PRICE'
        return ctx.reply('Digite o novo preço do item.')
      case 'SAVE':
        return saveItem(ctx)
      default:
        return
    }
  } else {
    switch (ctx.session.data.expecting) {
      case 'NAME':
        // @ts-ignore
        ctx.session.data.name = ctx.message!.text
        ctx.session.data.expecting = null
        return editSentMessage(ctx)
      case 'DESCRIPTION':
        // @ts-ignore
        ctx.session.data.description = ctx.message!.text
        ctx.session.data.expecting = null
        return editSentMessage(ctx)
      case 'PRICE':
        // @ts-ignore
        if (isNaN(parseInt(ctx.message!.text))) return ctx.reply('O preço precisa ser um número inteiro.')
        // check if number is 32 bits
        // @ts-ignore
        if (parseInt(ctx.message!.text) > 2147483645) return ctx.reply('O preço precisa ser um número inteiro de 32 bits (menor que 2147483647).')
        // @ts-ignore
        ctx.session.data.price = parseInt(ctx.message!.text)
        ctx.session.data.expecting = null
        return editSentMessage(ctx)
      default:
        return
    }
  }
}

const createItem = async (ctx: SessionContext<ItemData>) => {
  await ctx.session.deleteMainMessage()
  const fileExtension = ctx.session.data.fileLink.split('.').pop()
  const id = generateID(32)
  const imgString = `url:https://s3.girae.altadena.space/${id}.${fileExtension}`
  await _brklyn.images.uploadFileFromUrl(`${id}.${fileExtension}`, ctx.session.data.fileLink).catch(async () => {
    ctx.session.steps.leave()
    await ctx.reply('Erro ao fazer upload da imagem.')
    return false
  })

  let dbId: { id: number } | null = null
  switch (ctx.session.data.type) {
    case 'BACKGROUND':
      dbId = await _brklyn.db.profileBackground.create({
        data: {
          name: ctx.session.data.name,
          image: imgString
        }
      })
      await reportWithContext(ctx, 'CRIAÇÃO_DE_PAPEL_DE_PAREDE', { backgroundImageID: dbId.id, name: ctx.session.data.name })
      break
    case 'STICKER':
      dbId = await _brklyn.db.profileSticker.create({
        data: {
          name: ctx.session.data.name,
          image: imgString
        }
      })
      await reportWithContext(ctx, 'CRIAÇÃO_DE_STICKER', { stickerID: dbId.id, name: ctx.session.data.name })
      break
    default:
      break
  }

  if (!dbId) {
    ctx.session.steps.leave()
    return ctx.reply('Erro ao criar o item.')
  }

  await _brklyn.db.shopItem.create({
    data: {
      price: ctx.session.data.price,
      type: ctx.session.data.type,
      image: imgString,
      description: ctx.session.data.description,
      name: ctx.session.data.name,
      itemId: dbId.id
    }
  })

  ctx.session.steps.leave()
  return ctx.replyWithPhoto(imgString.replace('url:', ''), {
    caption: `${typeToEmoji[ctx.session.data.type]} <code>${dbId.id}</code>. <b>${ctx.session.data.name}</b>\n<i>${ctx.session.data.description}</i>\n\n💰 ${readableNumber(ctx.session.data.price)} moedas`,
    parse_mode: 'HTML'
  })
}

// @ts-ignore
export default new AdvancedScene<ItemData>('ADD_ITEM', [firstStep, secondStep], ['message', 'callback_query'])
