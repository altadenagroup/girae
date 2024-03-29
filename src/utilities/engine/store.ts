import { ShopItem, User } from "@prisma/client";

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

  await handleBoughtItem(user, item, amount)

  return true
}
