import { ItemType, ShopItem, User } from '@prisma/client'

export const handleBoughtItem = async (user: User, item: ShopItem, amount: number | undefined = undefined) => {
  switch (item.type) {
    case 'BACKGROUND':
      await _brklyn.db.userInventory.upsert({
        where: { userId: user.id },
        update: {
          backgroundIDs: { push: item.itemId }
        },
        create: {
          userId: user.id,
          backgroundIDs: [item.itemId]
        }
      })
      break
    case 'DRAWS':
      await _brklyn.db.user.update({
        where: {
          id: user.id
        },
        data: {
          usedDraws: { decrement: amount! }
        }
      })
      break
    case 'STICKER':
      await _brklyn.db.userInventory.upsert({
        where: { userId: user.id },
        update: {
          stickerIDs: { push: item.itemId }
        },
        create: {
          userId: user.id,
          stickerIDs: [item.itemId]
        }
      })
      break
    case 'MARRIAGE_RING':
      await _brklyn.db.userInventory.upsert({
        where: { userId: user.id },
        update: {
          ringIDs: { push: item.itemId }
        },
        create: {
          userId: user.id,
          ringIDs: [item.itemId]
        }
      })
      break
  }
}

export const buyStoreItem = async (user: User, item: ShopItem, amount: number | undefined = undefined) => {
  if (user.coins < item.price) {
    return false
  }

  await _brklyn.db.user.update({
    where: {
      id: user.id
    },
    data: {
      coins: { decrement: item.price }
    }
  })

  // add those funds to profile id 1983 (girae)
  await _brklyn.db.user.update({
    where: {
      id: 1983
    },
    data: {
      coins: { increment: item.price }
    }
  })

  await handleBoughtItem(user, item, amount)

  return true
}

export const findStoreItem = async (type: ItemType, itemId: number) => {
  return await _brklyn.db.shopItem.findFirst({
    where: {
      type,
      itemId
    }
  })
}
