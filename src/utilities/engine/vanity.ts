import { ProfileBackground, ProfileSticker } from '@prisma/client'

export const searchBackgrounds = async (query: string, page: number = 1, limit: number = 10): Promise<ProfileBackground[]> => {
  const cached = await _brklyn.cache.get('backgrounds', `${query}-${page}-${limit}`)
  if (cached) return cached

  const backgrounds = await _brklyn.db.profileBackground.findMany({
    where: {
      name: {
        search: query,
        mode: 'insensitive'
      }
    },
    take: limit,
    skip: (page - 1) * limit
  })

  await _brklyn.cache.setexp('backgrounds', `${query}-${page}-${limit}`, backgrounds, 60 * 5)
  return backgrounds
}

export const getBackgroundByID = async (id: number): Promise<ProfileBackground | null> => {
  return _brklyn.db.profileBackground.findUnique({
    where: { id }
  })
}

export const searchStickers = async (query: string, page: number = 1, limit: number = 10): Promise<ProfileSticker[]> => {
  const cached = await _brklyn.cache.get('stickers', `${query}-${page}-${limit}`)
  if (cached) return cached

  const stickers = await _brklyn.db.profileSticker.findMany({
    where: {
      name: {
        search: query,
        mode: 'insensitive'
      }
    },
    take: limit,
    skip: (page - 1) * limit
  })

  await _brklyn.cache.setexp('stickers', `${query}-${page}-${limit}`, stickers, 60 * 5)
  return stickers
}

export const getStickerByID = async (id: number): Promise<ProfileSticker | null> => {
  return _brklyn.db.profileSticker.findUnique({
    where: { id }
  })
}

export const checkIfUserOwnsBackground = async (userId: number, backgroundId: number): Promise<boolean> => {
  return _brklyn.db.userInventory.findFirst({
    where: {
      userId,
      backgroundIDs: { has: backgroundId }
    }
  }).then(Boolean)
}

export const checkIfUserOwnsSticker = async (userId: number, stickerId: number): Promise<boolean> => {
  return _brklyn.db.userInventory.findFirst({
    where: {
      userId,
      stickerIDs: { has: stickerId }
    }
  }).then(Boolean)
}

export const equipBackground = async (userId: number, backgroundId: number): Promise<boolean> => {
  return _brklyn.db.userProfile.update({
    where: { userId },
    data: {
      backgroundId
    }
  }).then(Boolean)
}

export const equipSticker = async (userId: number, stickerId: number): Promise<boolean> => {
  return _brklyn.db.userProfile.update({
    where: { userId },
    data: {
      stickerId
    }
  }).then(Boolean)
}
