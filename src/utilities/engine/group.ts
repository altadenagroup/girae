export const getOrCreateGroupConfig = async (groupId: number) => {
  const group = await _brklyn.db.groupConfig.findFirst({
    where: {
      groupId
    }
  })

  if (group) {
    return group
  }

  return await _brklyn.db.groupConfig.create({
    data: {
      groupId
    }
  })
}
