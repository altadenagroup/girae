import { TYPE_TO_EMOJI } from "../constants.js"
import { generateUserProfile } from "../scenes/add-item.js"
import { tcqc } from "../sessions/tcqc.js"
import { BotContext } from "../types/context.js"
import { buyStoreItem, equipItem } from "../utilities/engine/store.js"
import { getBackgroundByID, getStickerByID } from "../utilities/engine/vanity.js"
import { parseImageString } from "../utilities/lucky-engine.js"
import { generateID } from "../utilities/misc.js"

interface PurchaseOrder {
  shopItemID: number
  giraeID: number
  userName: string
  tgID: string
  autoEquip: boolean
  amount: number | undefined
  itemPrice: number
}

const createPurchaseCache = (data: PurchaseOrder) => {
  const id = generateID(16)
  return _brklyn.cache.set('pending_purchases', id, data).then(() => id)
}

const deletePurchaseCache = (id: string) => {
  return _brklyn.cache.del('pending_purchases', id)
}

const getPurchaseCache = (id: string) => {
  return _brklyn.cache.get('pending_purchases', id) as Promise<PurchaseOrder>
}

export default async (ctx: BotContext) => {
  if (!ctx.args[0]) return ctx.replyWithHTML('Hmmm... o que você quer comprar?\n\nUse <code>/comprar bg id</code> para comprar um background.\nUse <code>/comprar sticker id</code> para comprar um sticker.\nUse <code>/comprar giros quantidade</code> para comprar giros.')

  let type
  let id
  if (ctx.args[0] === 'bg' || ctx.args[0] === 'background') {
    if (!ctx.args[1]) return ctx.replyWithHTML('Você precisa especificar o ID do background que deseja comprar. Exemplo: <code>/comprar bg 17</code>')
    const bgID = parseInt(ctx.args[1])
    if (isNaN(bgID)) return ctx.reply('O ID do background precisa ser um número. Exemplo: <code>/comprar bg 17</code>')
    const bg = await getBackgroundByID(bgID)
    if (!bg) return ctx.reply('Background não encontrado.')
    type = 'BACKGROUND'
    id = bgID
  } else if (ctx.args[0] === 'sticker') {
    if (!ctx.args[1]) return ctx.replyWithHTML('Você precisa especificar o ID do sticker que deseja comprar. Exemplo: <code>/comprar sticker 17</code>')
    const stickerID = parseInt(ctx.args[1])
    if (isNaN(stickerID)) return ctx.reply('O ID do sticker precisa ser um número. Exemplo: <code>/comprar sticker 17</code>')
    const sticker = await getStickerByID(stickerID)
    if (!sticker) return ctx.reply('Sticker não encontrado.')
    type = 'STICKER'
    id = stickerID
  } else if (ctx.args[0] === 'giros' || ctx.args[0] === 'giro') {
    if (!ctx.args[1]) return ctx.replyWithHTML('Você precisa especificar a quantidade de giros que deseja comprar. Exemplo: <code>/comprar giros 100</code>')
    const giros = parseInt(ctx.args[1])
    if (isNaN(giros)) return ctx.reply('A quantidade de giros precisa ser um número. Exemplo: <code>/comprar giros 100</code>')
    if (giros < 1) return ctx.reply('A quantidade de giros precisa ser maior que 0.')
    // check if is integer
    if (giros % 1 !== 0) return ctx.reply('A quantidade de giros precisa ser um número inteiro.')
    const maximumPurchase = ctx.userData.usedDraws
    if (giros > maximumPurchase) return ctx.reply(`Você só pode comprar até ${maximumPurchase} giros atualmente.\nGaste mais giros para poder comprar mais de uma só vez.`)
    type = 'giros'
    id = giros
  } else {
    return ctx.replyWithHTML('Hmmm... o que você quer comprar?\n\nUse <code>/comprar bg id</code> para comprar um background.\nUse <code>/comprar sticker id</code> para comprar um sticker.\nUse <code>/comprar giros quantidade</code> para comprar giros.')
  }

  const shopItem = type === 'giros' ? await _brklyn.db.shopItem.findFirst({ where: { type: 'DRAWS' } }) : await _brklyn.db.shopItem.findFirst({ where: { type, itemId: id } })
  if (!shopItem) return ctx.reply('Ah... esse item não está disponível para compra nesse momento. Sinto muito.')

  const itemPrice = shopItem.price * (type === 'giros' ? id : 1)
  if (itemPrice > ctx.userData.coins) return ctx.reply(`Você não tem moedas suficientes para comprar esse item. Faltam ${itemPrice - ctx.userData.coins} moedas.\nTalvez eu possa te ajudar... você tem troco pra 100?`)

  const purchaseOrder: PurchaseOrder = {
    shopItemID: shopItem.id,
    itemPrice,
    giraeID: ctx.userData.id,
    userName: ctx.from.first_name,
    tgID: ctx.from.id.toString(),
    autoEquip: false,
    amount: type === 'giros' ? id : undefined
  }

  // @ts-ignore
  ctx.session = { data: { type, fileLink: shopItem.image } }
  // @ts-ignore
  const up = type === 'giros' ? parseImageString(shopItem.image, false, true) : await generateUserProfile(ctx, true)

  const orderID = await createPurchaseCache(purchaseOrder)

  const text = type === 'giros' ? _getGiroText(purchaseOrder) : _getItemText(purchaseOrder, shopItem)
  const buttons = type === 'giros' ? _generateGiroButtons(orderID) : _generateItemButtons(orderID)

  return ctx.replyWithPhoto(up, { caption: text, parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } })
}

tcqc.add<{ purchaseID: string, aq?: boolean }>('store.confirm', async (ctx) => {
  const purchaseOrder = await getPurchaseCache(ctx.data.purchaseID)
  if (!purchaseOrder) return ctx.answerCbQuery('Essa compra não existe mais. Talvez você tenha cancelado ou finalizado a compra.', { show_alert: true })

  if (ctx.from.id !== parseInt(purchaseOrder.tgID)) return ctx.answerCbQuery('Você não pode confirmar uma compra que não é sua.', { show_alert: true })

  const shopItem = await _brklyn.db.shopItem.findFirst({ where: { id: purchaseOrder.shopItemID } })
  const d = await buyStoreItem(ctx.userData, shopItem!, purchaseOrder.amount || 1)
  if (!d) return ctx.answerCbQuery('Você não tem moedas suficientes para comprar esse item.', { show_alert: true })
  await deletePurchaseCache(ctx.data.purchaseID)
  await ctx.deleteMessage()
  if (ctx.data.aq) {
    await equipItem(ctx.userData, shopItem!)
    return ctx.replyWithHTML(`✅ Compra finalizada! Você comprou e equipou <b>${shopItem!.name}</b> por <b>${purchaseOrder.itemPrice}</b> moedas.`)
  }

  if (shopItem!.type === 'DRAWS') return ctx.replyWithHTML(`✅ Compra finalizada! Você comprou <b>${purchaseOrder.amount}</b> giros por <b>${purchaseOrder.itemPrice}</b> moedas.`)
  return ctx.replyWithHTML(`✅ Compra finalizada! Você comprou <b>${shopItem!.name}</b> por <b>${purchaseOrder.itemPrice}</b> moedas.\n\nPara equipar, use <code>/${shopItem!.type === 'BACKGROUND' ? 'bg' : 'sticker'} ${shopItem!.itemId}</code>`)
})

tcqc.add<{ purchaseID: string }>('store.cancel', async (ctx) => {
  const purchaseOrder = await getPurchaseCache(ctx.data.purchaseID)
  if (!purchaseOrder) return ctx.answerCbQuery('Essa compra não existe mais. Talvez você tenha cancelado ou finalizado a compra.', { show_alert: true })

  if (ctx.from.id !== parseInt(purchaseOrder.tgID)) return ctx.answerCbQuery('Você não pode cancelar uma compra que não é sua.', { show_alert: true })

  await deletePurchaseCache(ctx.data.purchaseID)
  await ctx.deleteMessage()
  return ctx.reply('❌ Vish... compra cancelada. Será que o Pix não caiu?')
})

function _getItemText(purchaseOrder: PurchaseOrder, shopItem: any) {
  return `Comprando ${TYPE_TO_EMOJI[shopItem.type]} <b>${shopItem.name}</b> por <b>${purchaseOrder.itemPrice}</b> moedas...


✅ Clique em <b>Comprar</b> para comprar e adicionar ao seu inventário.

🔒 Use <b>Comprar e equipar</b> para comprar e equipar imediatamente. Você poderá reequipar o item antigo posteriormente.

❌ Clique em <b>Cancelar</b> para cancelar a compra.`
}

function _generateItemButtons (purchaseID: string) {
  return [
    [{
      text: '✅ Comprar',
      callback_data: tcqc.generateCallbackQuery('store.confirm', { purchaseID })
    },
    {
      text: '🔒 Comprar e equipar',
      callback_data: tcqc.generateCallbackQuery('store.confirm', { purchaseID, aq: true })
    }
  ],
  [
    {
      text: '❌ Cancelar',
      callback_data: tcqc.generateCallbackQuery('store.cancel', { purchaseID })
    }
  ]
  ]
}

function _generateGiroButtons (purchaseID: string) {
  return [
    [{
      text: '✅ Comprar',
      callback_data: tcqc.generateCallbackQuery('store.confirm', { purchaseID })
    },
    {
      text: '❌ Cancelar',
      callback_data: tcqc.generateCallbackQuery('store.cancel', { purchaseID })
    }
  ]
  ]
}

function _getGiroText(purchaseOrder: PurchaseOrder) {
  return `Comprando <b>${purchaseOrder.amount}</b> giros por <b>${purchaseOrder.itemPrice}</b> moedas...

  ✅ Clique em <b>Comprar</b> para finalizar a compra.
  ❌ Clique em <b>Cancelar</b> para cancelar a compra.`
}
