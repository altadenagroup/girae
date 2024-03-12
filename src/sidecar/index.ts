import { resetAllDailies, resetAllDraws, resetAllReps } from "../utilities/engine/users.js"
import cron from 'node-cron'

export class Sidecar {
  sixHours: any
  tenMinutes: any
  midnight: any
  constructor () {
    // reset reps is every 6h
    this.sixHours = cron.schedule('0 */6 * * *', () => {
      this.resetReps()
      this.increaseUserDraws()
    })
    // reset dailies is every 24h
    this.midnight = cron.schedule('0 0 * * *', () => this.resetDailies())
    // run clean up systems every 10m
    this.tenMinutes = cron.schedule('*/10 * * * *', () => this.cleanUpTasks())
  }

  async resetUserStuff () {
    await resetAllDailies()
    await resetAllReps()
    await resetAllDraws()
  }

  increaseUserDraws () {
    // decrement one till it reaches 0
    return _brklyn.db.user.updateMany({ where: { usedDraws: { gt: 0 } }, data: { usedDraws: { decrement: 2 } } })
  }

  resetReps () {
    return _brklyn.db.user.updateMany({ data: { hasGivenRep: false } })
  }

  resetDailies () {
    return resetAllDailies()
  }

  async cleanUpTasks () {
    // remove all subcategories with no cards in them
    // const victims = await _brklyn.db.subcategory.deleteMany({ where: { cards: { none: {} } } })
    // info('sidecar', `cleaned up ${victims.count} subcategories`)
  }

  nextSixHours () {
    return msToPtBRTime(timeUntilNextCron(6))
  }
}

// this function tells how much time is left until the next cron activation. the cron must activate every X hours
export const timeUntilNextCron = (activatesEvery: number) => {
  const now = new Date()
  const next = new Date(now.getTime() + (activatesEvery * 60 * 60 * 1000))
  return next.getTime() - now.getTime()
}

export const msToPtBRTime = (ms: number) => {
  const date = new Date(ms)
  return `${date.getHours()}h${date.getMinutes()}`
}