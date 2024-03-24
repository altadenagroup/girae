import { InlineKeyboardButton } from 'telegraf/types.js'
import { SessionContext } from '../sessions/context.js'
import { AdvancedScene } from '../sessions/scene.js'
import { Category } from '@prisma/client'
import { getAllCategories, getCategoryByID } from '../utilities/engine/category.js'
import { getRandomSubcategories, getSubcategoryByID } from '../utilities/engine/subcategories.js'
import { error, warn } from 'melchior'
import { drawCard } from '../utilities/engine/cards.js'
import { MEDAL_MAP, NUMBER_EMOJIS } from '../constants.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { addDraw, deduceDraw, getHowManyCardsUserHas } from '../utilities/engine/users.js'
import { determineMethodToSendMedia, launchStartURL } from '../utilities/telegram.js'

const CANCEL = 'cancel'

const CANCEL_BUTTON = [
  [{ text: '❌ Cancelar', callback_data: CANCEL }]
]

const sixOptionsCategories = ['K-POP', 'Variedades']

interface DrawData {
  chosenCategory: Category
}

const peopleUsingCommand = new Set()
const coolDownBucket = new Set()
const peopleOnGroup: number[] = []

const firstStep = async (ctx: SessionContext<DrawData>) => {
  ctx.session.setMessageToBeQuoted(ctx.message?.message_id)
  if (peopleUsingCommand.has(ctx.from?.id)) {
    ctx.session.steps.leave()
    return ctx.reply('Você já está girando uma carta. Por favor, termine de girá-la antes de começar outra.')
  }

  if (coolDownBucket.has(ctx.from?.id)) {
    ctx.session.steps.leave()
    return ctx.reply('Você está girando cartas muito rápido. Por favor, espere um pouco antes de girar novamente.')
  }

  if (peopleOnGroup.filter((id) => id === ctx.chat?.id).length > 3) {
    ctx.session.steps.leave()
    return ctx.reply('Há muitas pessoas girando neste grupo ao mesmo tempo. Por favor, espere um pouco antes de girar novamente.')
  }

  // try to get lock for current group
  const lock = await _brklyn.db.groupDrawLock.findFirst({
    where: {
      groupId: ctx.chat!.id
    }
  })

  let categories: Category[] = await getAllCategories()
  if (lock) {
    categories = categories.filter((cat) => lock.allowedCategories.includes(cat.id))
  }

  // inline keyboard with categories
  const keyboard = categories.map((category) => {
    return {
      text: category.emoji + ' ' + category.name,
      callback_data: ctx.session.nextStepData(category.id.toString())
    } as InlineKeyboardButton
  })
  const chunked = keyboard.chunk(2)

  const text = `<b>ATENÇÃO: ESTE COMANDO ESTÁ EM DESENVOLVIMENTO. AS ATUAIS CARTAS E POSSÍVEIS ERROS NÃO REPRESENTAM A QUALIDADE FINAL DO BOT.</b>

🎲 Olá, <b><a href="tg://user?id=${ctx.from?.id}">${ctx.from?.first_name}</a></b>! Bem-vindo de volta. Pronto para girar?
🎨 Você tem <b>${ctx.userData.maximumDraws - ctx.userData.usedDraws}</b> de <b>${ctx.userData.maximumDraws}</b> giros restantes.

🕹 Escolha uma categoria:`

  ctx.session.setAttribute('replayOnRateLimit', true)

  peopleUsingCommand.add(ctx.from?.id)
  coolDownBucket.add(ctx.from?.id)
  peopleOnGroup.push(ctx.chat!.id)
  setTimeout(() => coolDownBucket.delete(ctx.from?.id), 5000)
  setTimeout(() => peopleUsingCommand.delete(ctx.from?.id), 5000)
  setTimeout(() => peopleOnGroup.splice(peopleOnGroup.indexOf(ctx.chat!.id), 1), 5000)
  await ctx.replyWithAnimation('https://altadena.space/assets/girar-one.mp4', {
    caption: text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [...chunked, ...CANCEL_BUTTON as InlineKeyboardButton[][]]
    }
  }).then((msg) => ctx.session.setMainMessage(msg.message_id))
}

const secondStep = async (ctx: SessionContext<DrawData>, category: Category) => {
  if (ctx.callbackQuery?.data === CANCEL) {
    await ctx.session.deleteMainMessage()
    ctx.session.steps.leave()
    peopleUsingCommand.delete(ctx.from?.id)
    return ctx.reply('🚪 Comando cancelado.')
  }

  const categoryId = ctx.session.getCurrentStepData<number>(parseInt)
  if (!categoryId && !category) return
  const cat = category || await getCategoryByID(categoryId!)
  if (!cat) {
    await ctx.session.deleteMainMessage()
    ctx.session.steps.leave()
    return ctx.reply('🚪 Comando cancelado.')
  }

  ctx.session.data.chosenCategory = cat
  const subcategories = await getRandomSubcategories(cat.id, sixOptionsCategories.includes(cat.name) ? 6 : 4)
  const keyboard = subcategories.map((sub, i) => {
    return {
      text: `${NUMBER_EMOJIS[i + 1]}`,
      callback_data: ctx.session.nextStepData(sub.id.toString())
    } as InlineKeyboardButton
  })
  const chunked = keyboard.chunk(2)

  const text = subcategories.map((sub, i) => {
    return `${NUMBER_EMOJIS[i + 1]} — <b>${sub.name}</b>`
  }).join('\n')

  await deduceDraw(ctx.userData.id)

  if (category) {
    ctx.session.steps.jumpTo(2)

    await ctx.replyWithAnimation('https://altadena.space/assets/girar-two.mp4', {
      caption: `🎲 Escolha uma subcategoria para girar:\n\n${text}`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: chunked
      }
    }).then((msg) => ctx.session.setMainMessage(msg.message_id)).catch(async (e) => {
      warn('scenes.draw', 'could not send message: ' + e.message)
      await addDraw(ctx.userData.id)
      ctx.session.steps.leave()
      return ctx.reply('🚪 Comando cancelado.')
    })
  } else {
    ctx.session.steps.next()

    await ctx.editMessageMedia({
      type: 'animation',
      media: 'https://altadena.space/assets/girar-two.mp4',
      caption: `🎲 Escolha uma subcategoria para girar:\n\n${text}`,
      parse_mode: 'HTML'
    }, {
      reply_markup: {
        inline_keyboard: chunked
      },
    }).catch(async (e) => {
      warn('scenes.draw', 'could not edit message: ' + e.message)
      await addDraw(ctx.userData.id)
      await ctx.session.deleteMainMessage()
      ctx.session.steps.leave()
      return ctx.reply('🚪 Comando cancelado.')
    })
  }
}

const thirdStep = async (ctx: SessionContext<DrawData>) => {
  const subcategoryId = ctx.session.getCurrentStepData<number>(parseInt)
  if (!subcategoryId) return
  const sub = await getSubcategoryByID(subcategoryId)
  if (!sub) {
    await addDraw(ctx.userData.id)
    await ctx.session.deleteMainMessage()
    ctx.session.steps.leave()
    return ctx.replyWithHTML(`🚪 Comando cancelado.\nCaso você não tenha cancelado, por favor, encaminhe esta mensagem ao SAC.\n\n<code>NOT_FOUND_DB(${ctx.callbackQuery.data}, ${subcategoryId})</code>`)
  }

  await ctx.session.deleteMainMessage()
  ctx.session.steps.leave()

  const card = await drawCard(ctx.userData, ctx.session.data.chosenCategory, sub)
  if (!card) {
    await addDraw(ctx.userData.id)
    return ctx.replyWithHTML(`🚪 Comando cancelado.\nCaso você não tenha cancelado, por favor, encaminhe esta mensagem ao SAC.\n\n<code>NO_CARDS_FOUND(${ctx.callbackQuery.data}, ${subcategoryId})</code>`)
  }

  if (card === 'NO_DRAWS') {
    return ctx.replyWithHTML('Seus giros já acabaram. Você acha que é <i>tão</i> fácil assim roubar giros?')
  }

  await sendCard(ctx, card)
}

const sendCard = async (ctx, card, forceImg: string | undefined = undefined, final: boolean = false) => {
  const repeated = await getHowManyCardsUserHas(ctx.userData.id, card.id)
  const tagExtra = card.tags?.[0] ? `\n🔖 ${card.tags[0]}` : ''
  const text = `🎰 Parabéns, você ganhou e vai levar:

${MEDAL_MAP[card.rarity.name]} <code>${card.id}</code>. <b>${card.name}</b>
${card.category.emoji} <i>${card.subcategory.name}</i>${tagExtra}

👾 ${ctx.from?.first_name} (${repeated || 1}x)`

  const img = forceImg || parseImageString(card.image, 'ar_3:4,c_crop') || 'https://placehold.co/400x624.png?text=Use+/setimage+id+para+trocar%20esta%20imagem.'

  peopleUsingCommand.delete(ctx.from?.id)
  const method = determineMethodToSendMedia(img)
  return ctx[method!](img, {
    caption: text,
    parse_mode: 'HTML',
    reply_to_message_id: ctx.session.data._messageToBeQuoted,
    reply_markup: {
      inline_keyboard: [
        [{ text: '❌ Deletar card', url: launchStartURL('delete', card.id.toString()) }],
      ]
    }
  }).catch(async (e) => {
    if (final) return false
    if (e.message.includes('file identifier') && !final) {
      error('scenes.draw', `could not send card: ${card.id} (url ${img}). msg is ${e.message}. retrying with placeholder after 5s...`)
      return sendCard(ctx, card, 'https://placehold.co/400x624.png?text=Use+/setimage+id+para+trocar%20esta%20imagem.', true)
    }
    await new Promise((r) => setTimeout(r, 5000))
    await sendCard(ctx, card)
  })
}

// @ts-ignore
export default new AdvancedScene<DrawData>('START_DRAW', [firstStep, secondStep, thirdStep])
