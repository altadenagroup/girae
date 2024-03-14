import { resetAllDailies, resetAllDraws, resetAllReps } from "../utilities/engine/users.js"
import * as cron from 'cron'
import { msToDate } from "../utilities/misc.js"

export const REP_CRON = '0 */12 * * *'
export const DRAW_CRON = '0 */6 * * *'
export const DAILY_CRON = '0 0 * * *'

export class Sidecar {
  draws: cron.CronJob
  reps: cron.CronJob
  dailies: cron.CronJob

  constructor () {
    // reset reps is every 6h
    this.reps = new cron.CronJob(REP_CRON, () => this.resetReps(), null, true, 'America/Sao_Paulo')
    this.draws = new cron.CronJob(DRAW_CRON, () => this.increaseUserDraws(), null, true, 'America/Sao_Paulo')
    this.dailies = new cron.CronJob(DAILY_CRON, () => this.resetDailies(), null, true, 'America/Sao_Paulo')
  }

  async resetUserStuff () {
    await resetAllDailies()
    await resetAllReps()
    await resetAllDraws()
  }

  async increaseUserDraws () {
    // decrement one till it reaches 0
    await _brklyn.db.user.updateMany({ where: { usedDraws: { gt: 0 } }, data: { usedDraws: { decrement: 2 } } })
  }

  async resetReps () {
    await _brklyn.db.user.updateMany({ data: { hasGivenRep: false } })
  }

  resetDailies () {
    return resetAllDailies()
  }

  async cleanUpTasks () {
    // remove all subcategories with no cards in them
    // const victims = await _brklyn.db.subcategory.deleteMany({ where: { cards: { none: {} } } })
    // info('sidecar', `cleaned up ${victims.count} subcategories`)
  }

  async willRunIn (expr: string) {
    return msToDate(cron.timeout(expr))
  }
}
