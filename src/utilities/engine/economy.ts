export const addBalance = (userID: number, amount: number) => {
  return _brklyn.db.user.update({
    where: {
      id: userID
    },
    data: {
      coins: {
        increment: amount
      }
    }
  })
}

export const deductBalance = async (userID: number, amount: number) => {
  return await _brklyn.db.user.update({
    where: {
      id: userID
    },
    data: {
      coins: {
        decrement: amount
      }
    }
  })
}
