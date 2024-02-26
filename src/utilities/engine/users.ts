import { debug } from "melchior"

// get how many cards a user has
export const getUserCardsCount = async (userId: number) => {
    const cards = await _brklyn.db.userCard.count({
        where: {
            userId
        }
    })

    return cards
}

// tries setting the user's favorite card. first, it'll check if the user has said card. if not, it'll return false.
// if the user has the card, it'll set the favorite card and return true.
export const setFavoriteCard = async (userId: number, cardId: number) => {
    const userCard = await _brklyn.db.userCard.findFirst({
        where: {
            userId,
            cardId
        },
        include: {
            card: true
        }
    })

    if (!userCard) return false

    debug('users', `setting favorite card for user ${userId} to ${cardId} (name: ${userCard.card.name})`)
    await _brklyn.db.userProfile.update({
        where: {
            userId
        },
        data: {
            favoriteCardId: userCard.id
        }
    })

    return true
}

export const setFavoriteColor = async (userId: number, color: string) => {
    debug('users', `setting favorite color for user ${userId} to ${color}`)
    await _brklyn.db.userProfile.update({
        where: {
            userId
        },
        data: {
            favoriteColor: color
        }
    })
}

export const setBiography = async (userId: number, bio: string) => {
    debug('users', `setting biography for user ${userId} to ${bio}`)
    await _brklyn.db.userProfile.update({
        where: {
            userId
        },
        data: {
            biography: bio
        }
    })
}

export const resetAllDraws = async (): Promise<void> => {
    await _brklyn.db.user.updateMany({ data: { usedDraws: 0 } })
}

export const resetAllDailies = async (): Promise<void> => {
    await _brklyn.db.user.updateMany({ data: { hasGottenDaily: false } })
}

export const resetAllReps = async (): Promise<void> => {
    await _brklyn.db.user.updateMany({ data: { hasGivenRep: false } })
}

export const giveRep = async (from: number, to: number): Promise<boolean> => {
    const toUserProfile = await _brklyn.db.userProfile.findFirst({ where: { user: { tgId: to } }, include: { user: true } })
    if (!toUserProfile) return false

    await _brklyn.db.user.update({
        where: { tgId: from },
        data: { hasGivenRep: true }
    })

    await _brklyn.db.userProfile.update({
        where: { id: toUserProfile.id },
        data: { reputation: toUserProfile.reputation + 1 }
    })

    return true
}
