import { resetAllDailies, resetAllDraws, resetAllReps } from "../utilities/engine/users.js"

export class Sidecar {
  async resetUserStuff () {
    await resetAllDailies()
    await resetAllReps()
    await resetAllDraws()
  }
}
