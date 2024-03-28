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
import { determineMediaType, generateMessageLink, launchStartURL } from '../utilities/telegram.js'
import { BotContext } from '../types/context.js'

const sixOptionsCategories = ['GIRÁSIA', 'Variedades']

interface DrawData {
  chosenCategory: Category
}

const firstStep = async (ctx: SessionContext<DrawData>) => {
  ctx.session.setMessageToBeQuoted(ctx.message?.message_id)

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

  await _brklyn.cache.set('is_drawing', ctx.from?.id.toString(), true)

  await ctx.replyWithAnimation('https://altadena.space/assets/girar-one.mp4', {
    caption: text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [...chunked, _brklyn.es2.cancelButtonArray]
    }
  }).then(async (msg) => {
    ctx.session.setMainMessage(msg.message_id)
    await _brklyn.cache.incr('draw_cooldowns', ctx.from?.id.toString())
    await _brklyn.cache.incr('draw_cooldowns', ctx.chat!.id.toString())
    await _brklyn.cache.set('is_drawing', ctx.from?.id.toString(), generateMessageLink(ctx.chat!.id, msg.message_id, msg.message_thread_id))
    setTimeout(() => {
      _brklyn.cache.decr('draw_cooldowns', ctx.from?.id.toString())
      _brklyn.cache.decr('draw_cooldowns', ctx.chat!.id.toString())
    }, 3000)
  }).catch(async () => {
    await _brklyn.cache.del('is_drawing', ctx.from?.id.toString())
  })
}



const secondStep = async (ctx: SessionContext<DrawData>, category: Category) => {
  const categoryId = ctx.session.getCurrentStepData<number>(parseInt)
  if (!categoryId && !category) return
  const cat = category || await getCategoryByID(categoryId!)
  if (!cat) {
    await ctx.session.deleteMainMessage()
    ctx.session.steps.leave()
    await _brklyn.cache.del('is_drawing', ctx.from?.id.toString())
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
    }).then(async (msg) => {
      ctx.session.setMainMessage(msg.message_id)
    }).catch(async (e) => {
      warn('scenes.draw', 'could not send message: ' + e.message)
      return exitCommand(ctx, true, 'Esse comando expirou. Gire novamente.')
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
      ctx.session.steps.leave()
      return exitCommand(ctx, true, 'Esse comando expirou. Gire novamente.')
    })
  }
}

const thirdStep = async (ctx: SessionContext<DrawData>) => {
  const subcategoryId = ctx.session.getCurrentStepData<number>(parseInt)
  if (!subcategoryId) return

  ctx.session.steps.leave()
  const sub = await getSubcategoryByID(subcategoryId)
  if (!sub) {
    return exitCommand(ctx, true, 'Esse comando expirou. Gire novamente.')
  }

  if (!ctx.session.data.chosenCategory) {
    return exitCommand(ctx, false, 'Esse comando expirou. Gire novamente.')
  }

  if (!await _brklyn.cache.get('is_drawing', ctx.from?.id.toString())) {
    return ctx.answerCbQuery('Você não está mais girando. Por favor, use o comando de novo.', { show_alert: true })
  }

  const card = await drawCard(ctx.userData, ctx.session.data.chosenCategory, sub)
  if (!card) {
    return exitCommand(ctx, true, 'Houve um erro ao tentar girar. Por favor, tire uma print desta mensagem e envie no grupo de suporte do bot. (NO_CARDS_FOUND)')
  }

  if (card === 'NO_DRAWS') {
    await _brklyn.cache.del('is_drawing', ctx.from?.id.toString())
    return ctx.answerCbQuery('Seus giros já acabaram pelo o que estou vendo. Volte mais tarde?', { show_alert: true })
  }

  await _brklyn.cache.del('is_drawing', ctx.from?.id.toString())

  await sendCard(ctx, card)
}

const sendCard = async (ctx: BotContext, card, forceImg: string | undefined = undefined, final: boolean = false) => {
  const repeated = await getHowManyCardsUserHas(ctx.userData.id, card.id)
  const tagExtra = card.tags?.[0] ? `\n🔖 ${card.tags[0]}` : ''
  const text = `🎰 Parabéns, você ganhou e vai levar:

${MEDAL_MAP[card.rarity.name]} <code>${card.id}</code>. <b>${card.name}</b>
${card.category.emoji} <i>${card.subcategory.name}</i>${tagExtra}

👾 ${ctx.from?.first_name} (${repeated || 1}x)`

  const img = forceImg || parseImageString(card.image, 'ar_3:4,c_crop') || 'https://placehold.co/400x624.png?text=Use+/setimage+id+para+trocar%20esta%20imagem.'

  return ctx.editMessageMedia({
    type: determineMediaType(img),
    media: img,
    caption: text,
    parse_mode: 'HTML'
  }, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎲', url: launchStartURL('delete', card.id.toString()) }],
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

const exitCommand = async (ctx: SessionContext<DrawData>, giveDrawBack: boolean = false, message: string = '🚪 Comando cancelado.') => {
  // if this was a callback query, delete the message from which it originated from.
  if (ctx.callbackQuery) await ctx.deleteMessage()
  else await ctx.session.deleteMainMessage()

  ctx.session.steps.leave()
  await _brklyn.cache.del('is_drawing', ctx.from?.id.toString())
  if (giveDrawBack) {
    await addDraw(ctx.userData.id)
  }
  return ctx.answerCbQuery(message, { show_alert: true })
}

// @ts-ignore
export default new AdvancedScene<DrawData>('START_DRAW', [firstStep, secondStep, thirdStep])
