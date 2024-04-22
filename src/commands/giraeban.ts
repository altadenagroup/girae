import { BotContext } from '../types/context.js'
import { getMentionedTgUser, getMentionedUser, mentionUser } from '../utilities/telegram.js'
import { reportWithContext } from '../reporting/index.js'

export default async (ctx: BotContext) => {
  if (ctx.userData.id !== 1 && ctx.userData.id !== 2) return

  const tgUser = await getMentionedTgUser(ctx, ctx.args[0])
  const userD = await getMentionedUser(ctx, ctx.args[0])
  if (!tgUser || !userD) {
    return ctx.reply('O usuário não foi encontrado. Ele já usou a bot?')
  }

  // if the user is already banned, unban
  if (userD.isBanned) {
    await _brklyn.db.user.update({
      where: { id: userD.id },
      data: {
        isBanned: false,
        banMessage: null
      }
    })
    await _brklyn.cache.del('banned', userD.tgId.toString())
    await reportWithContext(ctx, 'DESBANIMENTO_DE_USUÁRIO', { giraeID: userD.id, tgID: tgUser.id.toString(), name: tgUser.first_name })

    return ctx.replyWithHTML(`O usuário ${mentionUser(tgUser)} foi desbanido de usar a Giraê.`)
  }

  const banReason = ctx.args.slice(1).join(' ')
  if (!banReason) {
    return ctx.reply('Você precisa especificar um motivo para banir o usuário.')
  }

  await _brklyn.db.user.update({
    where: { id: userD.id },
    data: {
      isBanned: true,
      banMessage: banReason
    }
  })

  await reportWithContext(ctx, 'BANIMENTO_DE_USUÁRIO', { giraeID: userD.id, tgID: tgUser.id.toString(), name: tgUser.first_name }, { newValue: banReason, field: 'motivo', oldValue: '...' })

  return ctx.replyWithHTML(`O usuário ${mentionUser(tgUser)} foi banido de usar a Giraê.\nMotivo: ${banReason}\n\nPara desbanir o usuário, execute o comando novamente.`)
}

export const info = {
  guards: ['isAdmin']
}
