// gets the top 3 users with the most money, and returns the user placement
export const getTopRichestUsers = async (limit: number) => {
  const cached = await _brklyn.cache.get('rankings', 'richest' + limit)
  if (cached) return cached

  let d = await _brklyn.db.user.findMany({
    take: limit,
    orderBy: {
      coins: 'desc'
    }
  })

  // turn tgid into a string
  // @ts-ignore
  d = d.map(x => ({ ...x, tgId: x.tgId.toString() }))

  await _brklyn.cache.setexp('rankings', 'richest' + limit, d, 30 * 60)
  return d
}

// reputation ranking
export const getTopReputationUsers = async (limit: number) => {
  const cached = await _brklyn.cache.get('rankings', 'reputation' + limit)
  if (cached) return cached

  let ar = await _brklyn.db.userProfile.findMany({
    take: limit,
    orderBy: {
      reputation: 'desc'
    },
    include: { user: { select: { tgId: true } } }
  })

  // @ts-ignore
  ar = ar.map(x => ({ ...x, user: null, tgId: x.user.tgId.toString(), id: x.userId }))

  await _brklyn.cache.setexp('rankings', 'reputation' + limit, ar, 30 * 60)
  return ar
}

// most cards ranking
export interface TopCardUser {
  id: number
  count: number
  tgId: number
}

export const getTopCardUsers = async (limit: number): Promise<TopCardUser[]> => {
  const cached = await _brklyn.cache.get('rankings', 'cards' + limit)
  if (cached) return cached

  const d = await _brklyn.db.userCard.groupBy({
    by: ['userId'],
    _count: {
      cardId: true
    },
    orderBy: {
      _count: {
        cardId: 'desc'
      }
    },
    take: limit
  })

  let data = d.map(x => ({ id: x.userId, count: x._count.cardId }))
  const users = await _brklyn.db.user.findMany({
    where: {
      id: {
        in: data.map(x => x.id)
      }
    }
  })

  data = data.map(x => {
    const user = users.find(u => u.id === x.id)
    return {
      id: x.id,
      count: x.count,
      tgId: user?.tgId ? user.tgId.toString() : 0
    }
  })

  await _brklyn.cache.setexp('rankings', 'cards' + limit, data, 30 * 60)
  return data as TopCardUser[]
}
