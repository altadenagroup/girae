import { InlineKeyboardButton } from 'telegraf/types'
import { SessionContext } from './context.js'
import { CurrentSceneStatus, SceneHandler } from './scene.js'
import { UpdateType } from 'telegraf/typings/telegram-types.js'
import { determineMethodToSendMedia } from '../utilities/telegram.js'

export interface PaginatedSceneData {
  currentPage: number
  totalPages: number
  currentModifiers: string[]
  hasImage: boolean
  userID: number
}

const controlButtons = [
  // skip to first page
  { text: '⏮️', data: 'FIRST_PAGE' },
  // go back a page
  { text: '⬅️', data: 'PREVIOUS_PAGE' },
  // go forward a page
  { text: '➡️', data: 'NEXT_PAGE' },
  // skip to last page
  { text: '⏭️', data: 'LAST_PAGE' }
]

// merge T and PaginatedSceneData
export class PaginatedScene<T extends PaginatedSceneData> {
  private buttons: string[][] = []

  constructor (public id: string, public handlers: SceneHandler<T>[],
               public allowedEvents: UpdateType[] = ['callback_query']) {
  }

  generateCallbackText (ctx, renderPage: number, userID: number, totalPages: number, modifiers: string[]) {
    return ctx.session.generateSessionQuery(`${this.id}.${userID}.${renderPage}/${totalPages}.${modifiers.join(',')}`)
  }

  dataAppendingModifier (ctx, data: T, modifier: string) {
    return this.generateCallbackText(ctx, data.currentPage, data.userID, data.totalPages, [...data.currentModifiers, modifier])
  }

  dataRemovingModifier (ctx, data: T, modifier: string) {
    return this.generateCallbackText(ctx, data.currentPage, data.userID, data.totalPages, data.currentModifiers.filter((m) => m !== modifier))
  }

  dataGoingToPage (ctx, data: T, page: number) {
    return this.generateCallbackText(ctx, page, data.userID, data.totalPages, data.currentModifiers)
  }

  determinePage (ctx, data: string, dataD: T) {
    if (data === 'FIRST_PAGE') return this.dataGoingToPage(ctx, dataD, 0)
    if (data === 'LAST_PAGE') return this.dataGoingToPage(ctx, dataD, dataD.totalPages - 1)
    if (data === 'NEXT_PAGE' && dataD.currentPage < (dataD.totalPages - 1)) return this.dataGoingToPage(ctx, dataD, dataD.currentPage + 1)
    if (data === 'PREVIOUS_PAGE' && dataD.currentPage > 0) return this.dataGoingToPage(ctx, dataD, dataD.currentPage - 1)
    return this.generateCallbackText(ctx, dataD.currentPage, dataD.userID, dataD.totalPages, dataD.currentModifiers)
  }

  shouldAddButton (data: T, button: string) {
    if (button === 'FIRST_PAGE') return data.currentPage > 0
    if (button === 'LAST_PAGE') return data.currentPage < data.totalPages - 1
    if (button === 'NEXT_PAGE') return data.currentPage < data.totalPages - 1
    if (button === 'PREVIOUS_PAGE') return data.currentPage > 0
    return true
  }

  parseData (data: string): [number, number, string[]] {
    const [_es2, _sk, _id, _user, page, modifiers] = data.split('.')
    const [currentPage, totalPages] = page.split('/').map((n) => parseInt(n))
    return [currentPage, totalPages, modifiers.split(',').filter((m) => m.length > 0)]
  }

  userMatches (data: string, userID: number) {
    return data.split('.')[2] === `${userID}`
  }

  generateButtons (ctx, dataD: T): InlineKeyboardButton[][] {
    const customButtons = this.buttons.map(([text, data]) => {
      return {
        text: dataD.currentModifiers.includes(data) ? `✅` : `${text}`,
        callback_data: dataD.currentModifiers.includes(data) ? this.dataRemovingModifier(ctx, dataD, data) : this.dataAppendingModifier(ctx, dataD, data)
      }
    }) as InlineKeyboardButton[]

    return [
      ...(customButtons.length > 0 ? customButtons.chunk(5) : []),
      ...(dataD.totalPages > 1 ? [controlButtons
        .filter((button) => this.shouldAddButton(dataD, button.data))
        .map((button) => {
          return {
            text: button.text,
            callback_data: this.determinePage(ctx, button.data, dataD)
          }
        })] : [])
    ]
  }

  addModifier (id: string, text: string) {
    this.buttons.push([text, id])
  }

  async generateText (_: T): Promise<string> {
    throw new Error('Method not implemented.')
  }

  async editMessage (ctx: SessionContext<T>) {
    const text = await this.generateText(ctx.session.data)
    if (ctx.session.data.hasImage) {
      return ctx.editMessageCaption(text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: this.generateButtons(ctx, ctx.session.data)
        }
      }).catch(() => {
      })
    } else {
      return ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: this.generateButtons(ctx, ctx.session.data)
        }
      }).catch(() => {
      })
    }
  }

  async sendInitialMessage (ctx: SessionContext<T>) {
    const text = await this.generateText(ctx.session.data)
    if (ctx.session.arguments?.imageURL) {
      ctx.session.data.hasImage = true
      const method = determineMethodToSendMedia(ctx.session.arguments.imageURL)
      return ctx[method](ctx.session.arguments.imageURL, {
        caption: text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: this.generateButtons(ctx, ctx.session.data)
        }
      }).then((msg) => ctx.session.setMainMessage(msg.message_id))
    } else {
      return ctx.replyWithHTML(text, {
        reply_markup: {
          inline_keyboard: this.generateButtons(ctx, ctx.session.data)
        }
      }).then((msg) => ctx.session.setMainMessage(msg.message_id))
    }
  }

  async handleCallback (ctx: SessionContext<T>) {
    try {
      const [page, totalPages, modifiers] = this.parseData(ctx.callbackQuery.data)
      ctx.session.data.currentPage = page
      ctx.session.data.totalPages = totalPages
      ctx.session.data.currentModifiers = modifiers
      return this.editMessage(ctx)
    } catch (e) {
      return { leave: true }
    }
  }

  setInitialData (ctx: SessionContext<T>) {
    ctx.session.data.currentPage = 0
    ctx.session.data.totalPages = 0
    ctx.session.data.currentModifiers = []
    ctx.session.data.hasImage = false
  }

  async run (ctx: SessionContext<T>): Promise<CurrentSceneStatus> {
    if (ctx.updateType === 'callback_query') {
      const r = await this.handleCallback(ctx)
      // @ts-ignore
      if (r?.leave) return { endSession: true, nextStep: undefined }
    } else {
      this.setInitialData(ctx)
      ctx.session.data = { ...(ctx.session.data || {}) }
      // add arguyments to data
      if (ctx.session.arguments) {
        Object.keys(ctx.session.arguments).forEach((key) => {
          ctx.session.data[key] = ctx.session.arguments![key]
        })
      }

      await this.sendInitialMessage(ctx)
    }

    return { nextStep: 0 } as CurrentSceneStatus
  }
}
