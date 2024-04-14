import { User } from 'telegraf/types.js'
import { SessionContext } from '../sessions/context.js'
import { AdvancedScene } from '../sessions/scene.js'
import { generateID, readableNumber } from '../utilities/misc.js'
import { ItemType } from '@prisma/client'

interface ItemData {
  name: string
  description: string
  fileLink: string
  type: ItemType
  price: number
}

const typeToEmoji: Record<ItemType, string> = {
  'BACKGROUND': '🖼',
  'STICKER': '🎨',
  'DRAWS': '🎡',
  'MARRIAGE_RING': '💍'
}

const firstStep = async (ctx: SessionContext<ItemData>) => {
  const name = ctx.session.arguments!.name as string
  const description = ctx.session.arguments!.description as string
  const fileID = ctx.session.arguments!.file as string
  const type = ctx.session.arguments!.type as ItemType
  const price = ctx.session.arguments!.price as number

  ctx.session.setMessageToBeQuoted(ctx.message?.message_id)
  ctx.session.data.name = name
  ctx.session.data.description = description
  ctx.session.data.fileLink = fileID
  ctx.session.data.type = type
  ctx.session.data.price = price

  switch (type) {
    case 'BACKGROUND':
      // @ts-ignore
      ctx.profileData.background = { image: `url:${fileID}` }
      break
    case 'STICKER':
      // @ts-ignore
      ctx.profileData.stickers = { image: `url:${fileID}` }
      break
    default:
      break
  }

  // @ts-ignore
  let dittoData = await _brklyn.ditto.generateProfile(ctx.userData, ctx.profileData, null, ctx.from as User)
  if (!dittoData?.url) dittoData.url = fileID
  console.log(dittoData)

  ctx.session.steps.next()

  return ctx.replyWithPhoto(dittoData.url, {
    caption: `Criando ${typeToEmoji[type]} <b>${name}</b>\n\n<i>${description}</i>\n\n💰 ${readableNumber(price)} moedas\n\nConfirme a criação do item clicando nos botões abaixo.`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Criar', callback_data: 'CREATE' }, { text: '❌ Cancelar', callback_data: 'CANCEL' }]
      ]
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
  if (ctx.callbackQuery?.data !== 'CREATE') return

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
      break
    case 'STICKER':
      dbId = await _brklyn.db.profileSticker.create({
        data: {
          name: ctx.session.data.name,
          image: imgString
        }
      })
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
export default new AdvancedScene<ItemData>('ADD_ITEM', [firstStep, secondStep])
