import { resetAllDailies, resetAllDraws, resetAllReps } from "../utilities/engine/users.js"
import cron from 'node-cron'

export class Sidecar {
  constructor () {
    // draw is every 2h
    cron.schedule('0 */2 * * *', () => this.increaseUserDraws())
    // reset reps is every 6h
    cron.schedule('0 */6 * * *', () => this.resetReps())
    // reset dailies is every 24h
    cron.schedule('0 0 * * *', () => this.resetDailies())
  }
  async resetUserStuff () {
    await resetAllDailies()
    await resetAllReps()
    await resetAllDraws()
  }

  increaseUserDraws () {
    // decrement one till it reaches 0
    return _brklyn.db.user.updateMany({ where: { usedDraws: { gt: 0 } }, data: { usedDraws: { decrement: 1 } } })
  }

  resetReps () {
    return _brklyn.db.user.updateMany({ data: { hasGivenRep: false } })
  }

  resetDailies () {
    return resetAllDailies()
  }
}
