export default async (ctx) => {
  // if this doesn't have a message, return
  if (!ctx.message) return

  if (process.env.ALLOW_FULL_GLOBAL_USAGE) return true
  if (ctx.chat?.id === -1002096118477 || ctx.chat?.id === -1002058397651 || ctx.chat?.id === -1001945644138 || ctx.chat?.id === -1001786847999) {
    return true
  }
  
  if (ctx.chat?.type === 'private') {
    return false
  }

  await ctx.reply(`Atualmente, este comando só pode ser executado nos grupos de testes!\n\nPara usá-los, considere doar para a Giraê, ou aguarde o lançamento oficial.`)
  return false
}
