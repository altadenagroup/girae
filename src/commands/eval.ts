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
  let r = '"no assignment made"'
  try {
    r = await eval(ctx.args.join(' '))
  } catch (e: any) {
    r = e?.message || e
  }

  await ctx.replyHTML(`<b>Code:</b> <pre><code class="language-javascript">${ctx.args.join(' ')}</code></pre>\n<b>Result:</b><pre><code class="language-javascript">${await clean(r)}</code></pre>`).catch((err) => {
    return ctx.replyHTML(`<pre><code class="language-javascript">${err.message}</code></pre>`)
  })
}

export const info = {
  guards: ['isDeveloper']
}
