import { UpdateType } from 'telegraf/typings/telegram-types'
import { SessionContext } from './context.js'

export type SceneHandler<DataType> = (ctx: SessionContext<DataType>) => Promise<void>

export class SceneController {
  nextCalled = false
  backCalled = false
  leaveCalled = false
  jumpToStep: number | null = null

  next () {
    this.nextCalled = true
  }

  back () {
    this.backCalled = true
  }

  leave () {
    this.leaveCalled = true
  }

  jumpTo (step: number) {
    this.jumpToStep = step
  }
}

export interface CurrentSceneStatus {
  nextStep: number | undefined
  endSession?: boolean
}

export class AdvancedScene<T> {
  constructor (
    public id: string,
    public handlers: SceneHandler<T>[],
    public allowedEvents: UpdateType[] = ['callback_query']
  ) {
  }

  async run (ctx: SessionContext<T>, step: number): Promise<CurrentSceneStatus> {
    const controller = ctx.session.steps
    const handler = this.handlers[step]

    if (!handler) {
      throw new Error(`No handler for step ${step} in scene ${this.id}`)
    }

    await handler(ctx)
    let currentStatus: CurrentSceneStatus = {
      nextStep: step
    }

    if (controller.jumpToStep !== null) {
      currentStatus = {
        nextStep: controller.jumpToStep
      }
    } else if (controller.nextCalled) {
      currentStatus = {
        nextStep: step + 1
      }
    } else if (controller.backCalled) {
      currentStatus = {
        nextStep: step - 1
      }
    }

    if (controller.leaveCalled) {
      currentStatus = {
        nextStep: undefined,
        endSession: true
      }
    }

    return currentStatus as CurrentSceneStatus
  }
}
