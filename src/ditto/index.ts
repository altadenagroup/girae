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

export interface UserData {
  name: string
  id: number
}

export class Ditto {
  async generateProfile (userD: User, completeUserData: UserProfile & {
    background: ProfileBackground | null,
    stickers: ProfileSticker | null,
    favoriteCard: UserCard | null
  }, favoriteCard: Card | null, tgUser: TelegramUser) {
    const file = await cachedGetUserPhotoAndFile(tgUser!.id)
    const avatarURL = file ? `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}` : 'https://placehold.co/300x300.png?text=sem+foto'

    let badges: string[] = []
    if (userD.isAdmin) badges = [...badges, '👮‍♂️']
    if (userD.isBanned) badges = [...badges, '🚫']
    if (userD.isPremium) badges = [...badges, '💎']
    if (completeUserData?.badgeEmojis.length > 0) badges = [...badges, ...completeUserData.badgeEmojis]
    // remove duplicates
    badges = [...new Set(badges)]

    const data = {
      avatarURL,
      username: tgUser.first_name,
      bio: completeUserData.biography,
      favoriteColor: completeUserData.favoriteColor,
      reputation: completeUserData.reputation,
      coins: userD.coins,
      backgroundURL: parseImageString(completeUserData!.background?.image!, false),
      favoriteCardImageURL: favoriteCard && (parseImageString(favoriteCard!.image, undefined, true) ?? MISSING_CARD_IMG),
      favoriteCardName: favoriteCard && favoriteCard!.name,
      favoriteCardRarity: favoriteCard && rarityIdToName[favoriteCard!.rarityId],
      position: 1,
      badgeEmojis: badges,
      totalCards: await getUserCardsCount(userD.id),
      stickerURL: completeUserData?.stickers?.image && parseImageString(completeUserData?.stickers?.image!, false)
    }

    return _brklyn.generateImage('user_profile', data)
  }

  async generateTrade (user1: UserData, user2: UserData, user1Images: string[], user2Images: string[]) {
    const user1File = await cachedGetUserPhotoAndFile(user1.id)
    const user2File = await cachedGetUserPhotoAndFile(user2.id)
    const user1AvatarURL = user1File ? `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${user1File.file_path}` : 'https://placehold.co/300x300.png?text=sem+foto'
    const user2AvatarURL = user2File ? `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${user2File.file_path}` : 'https://placehold.co/300x300.png?text=sem+foto'

    return _brklyn.generateImage('trade', {
      user1: { name: user1.name, avatarURL: user1AvatarURL, cards: user1Images },
      user2: { name: user2.name, avatarURL: user2AvatarURL, cards: user2Images }
    }).then(a => {
      if (!a?.url) return { url: 'https://altadena.space/assets/banner-beta-low.jpg' }
      return a
    })
  }
}
