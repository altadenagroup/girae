import { resetAllDailies, resetAllDraws, resetAllReps } from "../utilities/engine/users.js"
import * as cron from 'cron'
import { msToDate } from "../utilities/misc.js"
import { debug } from 'melchior'

export const REP_CRON = '0 0 */12 * * *'
export const DRAW_CRON = '0 0 */3 * * *'
export const DAILY_CRON = '0 0 0 * * *'

export class Sidecar {
  draws: cron.CronJob | undefined
  reps: cron.CronJob | undefined
  dailies: cron.CronJob | undefined
  drawCooldowns: cron.CronJob | undefined

  scheduleAll() {
    // reset reps is every 6h
    this.reps = new cron.CronJob(REP_CRON, () => this.resetReps(), null, true, 'America/Sao_Paulo')
    this.draws = new cron.CronJob(DRAW_CRON, () => this.increaseUserDraws(), null, true, 'America/Sao_Paulo')
    this.dailies = new cron.CronJob(DAILY_CRON, () => this.resetDailies(), null, true, 'America/Sao_Paulo')

    setTimeout(() => this.deleteDrawCooldowns(), 10_000)
  }

  async deleteDrawCooldowns () {
    await _brklyn.cache.clearNamespace('draw_cooldowns')
  }

  async resetUserStuff() {
    debug('sidecar', 'called resetUserStuff')
    await resetAllDailies()
    await resetAllReps()
    await resetAllDraws()
  }

  async increaseUserDraws() {
    debug('sidecar', 'called increaseUserDraws')
    await _brklyn.db.$executeRaw`UPDATE "User" SET "usedDraws" = "usedDraws" - 1 WHERE "usedDraws" > 0`
    await _brklyn.db.$executeRaw`UPDATE "User" SET "usedDraws" = "maximumDraws" - 1 WHERE "usedDraws" >= "maximumDraws"`
  }

  async resetReps() {
    await _brklyn.db.user.updateMany({ data: { hasGivenRep: false } })
  }

  resetDailies() {
    return resetAllDailies()
  }

  async cleanUpTasks() {
    // remove all subcategories with no cards in them
    // const victims = await _brklyn.db.subcategory.deleteMany({ where: { cards: { none: {} } } })
    // info('sidecar', `cleaned up ${victims.count} subcategories`)
  }

  willRunIn(expr: string) {
    return msToDate(cron.timeout(expr))
  }
}
