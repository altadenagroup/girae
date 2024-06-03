import { Card } from '@prisma/client'
import { SessionContext } from '../sessions/context.js'
import { AdvancedScene } from '../sessions/scene.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { determineMethodToSendMedia } from '../utilities/telegram.js'
import { addBalance } from '../utilities/engine/economy.js'
import { warn } from 'melchior'

interface DeleteData {
  card: Card
  multipleCards: Card[]
  usercardIds: number[]
  deletionPhrase: string
  price: number
}

const rarityIdToPrice = {
  1: ['🥉 Comum', 250],
  3: ['🥈 Raro', 500],
  4: ['🥇 Lendário', 1000]
}

const BUTTONS = [[
  { text: '🚮 Confirmar', callback_data: 'mkmdlqwfq' },
  { text: '❌ Cancelar', callback_data: 'fepkpkp' }
]]

const firstStep = async (ctx: SessionContext<DeleteData>) => {
  ctx.session.setMessageToBeQuoted(ctx.message?.message_id)
  if (!ctx.session.arguments) {
    ctx.session.steps.leave()
    return ctx.reply('❌ Ocorreu um erro ao deletar o card. Tente deletar o card novamente.')
  }
  const card = ctx.session.arguments!.card
  const multipleCards = ctx.session.arguments!.multipleCards

  ctx.session.data.card = card
  ctx.session.data.multipleCards = multipleCards

  let cards
  let hasCards
  let missingCards
  if (card) {
    const c = await _brklyn.db.userCard.findFirst({
      where: {
        cardId: ctx.session.data.card.id,
        userId: ctx.userData.id
      },
      include: {
        card: true
      }
    })
    cards = c ? [c] : []
    hasCards = c ? true : false
  } else {
    let c = await _brklyn.db.userCard.findMany({
      where: {
        cardId: {
          in: ctx.session.data.multipleCards.map((c) => c.id)
        },
        userId: ctx.userData.id
      },
      include: {
        card: true
      }
    })
    // only one card per id, unless the multipleCards has multiple cards with the same id
    for (const card of new Set(ctx.session.data.multipleCards)) {
      // TODO: refactor this, it's too late at night n my brain isnt working as it should
      let cardCount = ctx.session.data.multipleCards.filter((c) => c.id === card.id).length
      // if cardCount is 1 but there are 3 cards in c with the same id, remove 2 items
      if (c.filter((cc) => cc.cardId === card.id).length > cardCount) {
        const matches = c.filter((cc) => cc.cardId === card.id)
        c = c.filter((cc) => cc.cardId !== card.id)
        for (let i = 0; i < cardCount; i++) {
          c.push(matches[i])
        }
      }
    }

    cards = c
    hasCards = c.length > 0
    missingCards = ctx.session.data.multipleCards.filter((c) => !c)
  }

  if (!hasCards) {
    ctx.session.steps.leave()
    if (missingCards) {
      return ctx.reply(`❌ Você não possui os seguintes cards: ${missingCards.map((c) => c.name).join(', ')}.`)
    }
    return ctx.reply('❌ Você não possui esse card. Você clicou no botão errado, provavelmente.')
  }

  const deletionCards = cards.map((c) => `${rarityIdToPrice[c.card.rarityId][0].split(' ')[0]} <code>${c.card.id}</code>. <b>${c.card.name}</b>`).join('\n')
  let price = 0

  for (const c of cards) {
    price += rarityIdToPrice[c.card.rarityId][1]
  }

  ctx.session.data.usercardIds = cards.map((c) => c.id)
  ctx.session.data.price = price
  ctx.session.steps.next()

  const img = ctx.session.data.card?.image ? parseImageString(ctx.session.data.card.image, 'ar_3:4,c_crop') : null
  const method = img ? determineMethodToSendMedia(img) : null
  const text = `Você está deletando...

${deletionCards}

💱 Valor que você receberá: ${price} moedas

Para confirmar a deleção, clique em <b>🚮 Confirmar</b>, ou;
cancele clicando em <b>❌ Cancelar</b>.
`
  if (!method) return ctx.replyWithHTML(text, {
    reply_markup: {
      inline_keyboard: BUTTONS
    }
  }).then((m) => ctx.session.setMainMessage(m.message_id))

  return ctx[method](img!, {
    caption: text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: BUTTONS
    }
  }).then((m) => ctx.session.setMainMessage(m.message_id))
}

const secondStep = async (ctx: SessionContext<DeleteData>) => {
  if (ctx.callbackQuery?.data !== 'mkmdlqwfq') {
    ctx.session.steps.leave()
    await ctx.session.deleteSession()
    await ctx.session.deleteMainMessage().catch(() => 0)
    return ctx.reply('Operação cancelada.')
  }

  ctx.session.steps.leave()

  const t = await _brklyn.db.userCard.deleteMany({
    where: {
      id: {
        in: ctx.session.data.usercardIds
      }
    }
  }).catch((e) => {
    warn('es²', `failed to delete card: ${e.message}`)
    return false
  })
  if (t === false) return ctx.reply('❌ Ocorreu um erro ao deletar o card. Tente novamente mais tarde.')

  await ctx.session.deleteSession()
  await addBalance(ctx.userData.id, ctx.session.data.price)
  await ctx.session.deleteMainMessage().catch(() => 0)
  await ctx.replyWithHTML(`👍 ${ctx.session.data.usercardIds.length > 1 ? 'Os cards foram deletados' : 'O card foi deletado'} com sucesso! Você recebeu <b>${ctx.session.data.price}</b> moedas.`)
  return
}

export default new AdvancedScene('DELETE_CONFIRM', [
  // @ts-ignore
  firstStep,
  // @ts-ignore
  secondStep
])
