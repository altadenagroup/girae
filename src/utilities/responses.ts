// load the common responses from assets/texts/common.yml
import { readFileSync } from 'fs'
import { parse } from 'yaml'
import { BotContext } from '../types/context.js'

const common = parse(readFileSync('./assets/texts/common.yml', 'utf-8'))

// escape < and > to avoid parsing issues
export const escapeForHTML = (str: string) => str
  .replaceAll(/</g, '&lt;')
  .replaceAll(/>/g, '&gt;')
  .replaceAll(/&/g, '&amp;')


export default class ResponseSystem {
  ctx: BotContext

  constructor (ctx: BotContext) {
    this.ctx = ctx
  }

  replyMissingArgument (whatIsMissing: string, usage: string | undefined = undefined) {
    const first = this.use('forgotToSay', { what: whatIsMissing })
    const second = usage ? this.use('commandExample', { usage: escapeForHTML(usage) }) + '\n' : ''
    return this.ctx.replyWithHTML(`${first}\n${second}\n${this.use('tryAgain')}`)
  }

  replyCouldNotFind (what: string) {
    return this.ctx.replyWithHTML(this.use('couldNotFind', { what }))
  }

  use (key: string, args: Record<string, any> | undefined = undefined) {
    const response = common[key]
    if (!response) return
    if (!args) return response
    // replace $prop with the value of args[prop]
    return response.replace(/\$(\w+)/g, (_, prop) => args[prop])
  }

  gottaQuote (action: string) {
    return this.ctx.replyWithHTML(this.use('gottaQuoteMessage', { action }))
  }
}

export const addCommas = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
