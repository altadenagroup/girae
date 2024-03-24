import { BotContext } from '../types/context.js'
import { getCategoryByName } from '../utilities/engine/category.js'

export default async (ctx: BotContext) => {
  const cats = ctx.args[0]
  if (!cats) {
    return ctx.reply('Você precisa especificar os nomes das categorias que serão permitidas.\n\nUsa-se catlock categoria1 categoria2')
  }

  const categories = await Promise.all(cats.split(' ').map(c => {
    return getCategoryByName(c)
  }))

  if (!categories.every(c => c)) {
    return ctx.reply('Uma ou mais categorias não foram encontradas.')
  }

  await _brklyn.db.groupDrawLock.upsert({
    where: {
      groupId: ctx.chat!.id
    },
    create: {
      groupId: ctx.chat!.id,
      allowedCategories: categories.map(c => c.id)
    },
    update: {
      allowedCategories: categories.map(c => c.id)
    }
  })

  return ctx.replyWithHTML(`As seguintes categorias foram permitidas:\n\n${categories.map(c => c.emoji + ' <b>' + c.name + '</b>').join('\n')}`)
}

export const info = {
  guards: ['hasJoinedGroup', 'isAdmin']
}
