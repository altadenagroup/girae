import { tcqc } from "../../sessions/tcqc.js"

interface ProposedActionReturn {
  id: number
  acceptanceData: string
  rejectionData: string
}

export const userHasPendingPhotoSwitch = async (userID: number): Promise<boolean> => {
  const data = await _brklyn.db.proposedAction.findFirst({
    where: {
      userId: userID,
      type: 'CATIVEIRO_CUSTOM_PHOTO'
    }
  })

  return !!data
}

export const insertCativeiroPhotoSwitch = async (userID, cardID, imageString): Promise<ProposedActionReturn> => {
  const payload = JSON.stringify({ id: cardID, image: imageString })
  const data = await _brklyn.db.proposedAction.create({
    data: {
      type: 'CATIVEIRO_CUSTOM_PHOTO',
      data: payload,
      userId: userID
    }
  })

  const acceptData = tcqc.generateCallbackQuery('catpsw', { id: data.id, d: 'yes' })
  const rejectData = tcqc.generateCallbackQuery('catpsw', { id: data.id, d: 'no' })

  // return ID
  return {
    id: data.id,
    acceptanceData: acceptData,
    rejectionData: rejectData
  }
}

export interface CativeiroPhotoSwitchData {
  userID: number
  cardID: number
  imageString: string
}

export const getPhotoSwitch = async (id: number): Promise<CativeiroPhotoSwitchData | null> => {
  const data = await _brklyn.db.proposedAction.findUnique({
    where: {
      id
    }
  })

  if (!data) return null

  const parsed = JSON.parse(data.data)
  return {
    userID: data.userId,
    cardID: parsed.id,
    imageString: parsed.image
  }
}
