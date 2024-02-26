import { BotContext } from '../types/context.js'
import { getCardByID } from '../utilities/engine/cards.js'
import { getUserCardsCount } from '../utilities/engine/users.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { escapeForHTML } from '../utilities/responses.js'
import { cachedGetUserPhotoAndFile } from '../utilities/telegram.js'

const rarityIdToName = {
    1: 'Common',
    3: 'Rare',
    4: 'Legendary'
}

export default async (ctx: BotContext) => {
    const file = await cachedGetUserPhotoAndFile(ctx.from!.id)
    const avatarURL = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`
    const completeUserData = await _brklyn.db.userProfile.findFirst({
        where: {
            userId: ctx.userData.id
        },
        include: {
            background: true,
            favoriteCard: true,
            stickers: true
        }
    })

    // get favorite card
    const favoriteCard = await getCardByID(completeUserData!.favoriteCard?.cardId)

    const data = {
        avatarURL,
        username: ctx.from!.first_name,
        bio: ctx.profileData.biography,
        favoriteColor: ctx.profileData.favoriteColor,
        reputation: ctx.profileData.reputation,
        coins: ctx.userData.coins,
        backgroundURL: parseImageString(completeUserData!.background?.image!),
        favoriteCardImageURL: favoriteCard && parseImageString(favoriteCard!.image, 'ar_3:4,c_crop'),
        favoriteCardName: favoriteCard && favoriteCard!.name,
        favoriteCardRarity: favoriteCard && rarityIdToName[favoriteCard!.rarityId],
        position: 1,
        badgeEmojis: completeUserData?.badgeEmojis[0] ? completeUserData?.badgeEmojis : undefined,
        totalCards: await getUserCardsCount(ctx.userData.id),
        stickerURL: completeUserData?.stickers && parseImageString(completeUserData?.stickers?.image)
    }

    const dittoData = await _brklyn.generateImage('user_profile', data)
    if (!dittoData?.url) {
        return ctx.reply('Desculpe, não consegui gerar a imagem do perfil. 😔\nTente novamente mais tarde. Se o problema persistir, entre em contato com meu suporte, em @giraesupport.')
    }
    
    ctx.replyWithPhoto(dittoData.url, {
        caption: `Perfil de <b>${escapeForHTML(ctx.from!.first_name)}</b>`,
        parse_mode: 'HTML'
    })

    return
}

export const info = {
    guards: ['hasJoinedGroup'],
    aliases: ['perfil', 'me']
}
