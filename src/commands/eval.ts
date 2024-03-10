import { inspect } from 'node:util'

const clean = async (val) => {
  if (val && val.constructor?.name === 'Promise') val = await val
  if (typeof val !== 'string') val = inspect(val, { depth: 2 })
  return val
  .replaceAll(_brklyn.telegram.token, '<REDACTED>')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
}

export default async (ctx) => {
  const engine = await import('../utilities/engine/index.js')
  let r2s = engine.r2s
  let subcategories = engine.subcategories
  let users = engine.users
  let rarities = engine.rarities
  let economy = engine.economy
  let cards = engine.cards
  let categories = engine.categories

  let code = ctx.update.message.text.split(' ').slice(1).join(' ')
  let r = '"no assignment made"'
  // if the code doesn't have an \n, we assume it's a single line and we wrap it in a function
  if (!code.includes('\n')) code = `(async () => (${code}))()`

  try {
    r = await eval(code)
  } catch (e: any) {
    r = e?.message || e
  }

  await ctx.replyWithHTML(`<b>Code:</b> <pre><code class="language-javascript">${code}</code></pre>\n<b>Result:</b><pre><code class="language-javascript">${await clean(r)}</code></pre>`).catch((err) => {
    return ctx.replyWithHTML(`<pre><code class="language-javascript">${err.message}</code></pre>`)
  })
}

export const info = {
  guards: ['isDeveloper']
}
