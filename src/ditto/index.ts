import { Card, ProfileBackground, ProfileSticker, User, UserCard, UserProfile } from '@prisma/client'
import { User as TelegramUser } from 'telegraf/types'
import { cachedGetUserPhotoAndFile } from '../utilities/telegram.js'
import { parseImageString } from '../utilities/lucky-engine.js'
import { getUserCardsCount } from '../utilities/engine/users.js'
import { MISSING_CARD_IMG } from '../constants.js'

const rarityIdToName = {
  1: 'Common',
  3: 'Rare',
  4: 'Legendary'
}

export class Ditto {
  async generateProfile (userD: User, completeUserData: UserProfile & {
    background: ProfileBackground | null,
    stickers: ProfileSticker | null,
    favoriteCard: UserCard | null
  }, favoriteCard: Card | null, tgUser: TelegramUser) {
    const file = await cachedGetUserPhotoAndFile(tgUser!.id)
    const avatarURL = file ? `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}` : 'https://placehold.co/300x300.png?text=sem+foto'

    let badges = completeUserData?.badgeEmojis || []
    if (userD.isAdmin) badges = [...badges, '👮‍♂️']
    if (userD.isBanned) badges = [...badges, '🚫']
    if (userD.isPremium) badges = [...badges, '💎']
    // remove duplicates
    badges = [...new Set(badges)]

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
      stickerURL: completeUserData?.stickers?.image && parseImageString(completeUserData?.stickers?.image!, undefined, true)
    }

    return _brklyn.generateImage('user_profile', data)
  }
}
