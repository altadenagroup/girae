import { BotContext } from '../types/context.js'
import { getCardByID } from '../utilities/engine/cards.js'
import { getUserCardsCount } from '../utilities/engine/users.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { escapeForHTML } from '../utilities/responses.js'
import { cachedGetUserPhotoAndFile, getMentionedTgUser, getMentionedUser } from '../utilities/telegram.js'
import { MISSING_CARD_IMG } from '../constants.js'

const rarityIdToName = {
  1: 'Common',
  3: 'Rare',
  4: 'Legendary'
}

export default async (ctx: BotContext) => {
  if (ctx.args[0]?.startsWith?.('edit')) {
    const text = `<b>🖼 Como editar o perfil?</b>\n\n/fav - define sua carta favorita (exemplo: <code>/fav ningning</code>)
/bio - define sua biografia (exemplo: <code>/bio eu amo a ningning</code>)
/color - define sua cor favorita (exemplo: <code>/color #ff0000</code>)`
    return ctx.replyWithHTML(text)
  }
  const tgUser = getMentionedTgUser(ctx)
  const userD = await getMentionedUser(ctx)
  if (!tgUser || !userD) {
    return ctx.reply('O usuário não foi encontrado. 😔\nEle já usou a bot?')
  }

  const file = await cachedGetUserPhotoAndFile(tgUser!.id)
  const avatarURL = file ? `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}` : 'https://placehold.co/300x300.png?text=sem+foto'


  const completeUserData = await _brklyn.db.userProfile.findFirst({
    where: {
      userId: userD.id
    },
    include: {
      background: true,
      favoriteCard: true,
      stickers: true
    }
  })
  if (!completeUserData) {
    return ctx.reply('Desculpe, não consegui encontrar o perfil desse usuário. 😔')
  }

  let badges = completeUserData?.badgeEmojis || []
  if (userD.isAdmin) badges = [...badges, '👮‍♂️']
  if (userD.isBanned) badges = [...badges, '🚫']
  if (userD.isPremium) badges = [...badges, '💎']
  // remove duplicates
  badges = [...new Set(badges)]

  // get favorite card
  const favoriteCard = await getCardByID(completeUserData!.favoriteCard?.cardId)

  const data = {
    avatarURL,
    username: tgUser.first_name,
    bio: completeUserData.biography,
    favoriteColor: completeUserData.favoriteColor,
    reputation: completeUserData.reputation,
    coins: userD.coins,
    backgroundURL: parseImageString(completeUserData!.background?.image!, undefined, true),
    favoriteCardImageURL: favoriteCard && (parseImageString(favoriteCard!.image, undefined, true) ?? MISSING_CARD_IMG),
    favoriteCardName: favoriteCard && favoriteCard!.name,
    favoriteCardRarity: favoriteCard && rarityIdToName[favoriteCard!.rarityId],
    position: 1,
    badgeEmojis: badges,
    totalCards: await getUserCardsCount(userD.id),
    stickerURL: completeUserData?.stickerId && parseImageString(completeUserData?.stickers?.image!, undefined, true)
  }

  const dittoData = await _brklyn.generateImage('user_profile', data)
  if (!dittoData?.url) {
    return ctx.reply('Desculpe, não consegui gerar a imagem do perfil. 😔\nTente novamente mais tarde. Se o problema persistir, entre em contato com meu suporte, em @giraesupport.')
  }

  await ctx.replyWithPhoto(dittoData.url, {
    caption: `🖼 <code>${userD.id}</code>. <b>${escapeForHTML(tgUser.first_name)}</b>\n\n<i>dica: use <code>/perfil editar</code> para aprender como customizar seu perfil</i>`,
    parse_mode: 'HTML'
  })

  return
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['perfil', 'me']
}
