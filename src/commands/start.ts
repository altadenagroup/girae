import { generateImageURL, hasUserDisplayMessageID, setUserDisplayMessageID } from '../scenes/start-trade.js'
import { BotContext } from '../types/context.js'
import deleteCommand from './delete.js'

export default async (ctx: BotContext) => {
  if (ctx.args[0]) {
    if (ctx.args[0].startsWith('delete')) {
      ctx.args = [ctx.args[0].split('-')[1]]
      await deleteCommand(ctx)
      return
    }
    if (ctx.args[0].startsWith('trade')) {
      const ec = await _brklyn.es2.getEC(ctx.from!.id, 'tradeData')
      if (!ec) return ctx.reply('Hmmm... acho que você clicou no botão errado, porque você não está trocando nada no momento. 🙃')
      if (await hasUserDisplayMessageID(ctx)) return
      await tradeMessage(ctx)
      return
    }
  }

  return ctx.reply('oii')
}

async function tradeMessage (ctx: BotContext) {
  const imgURL = await generateImageURL(await _brklyn.es2.getEC(ctx.from!.id, 'tradeData'))

  const m = await ctx.sendPhoto(imgURL ?? 'https://altadena.space/assets/banner-beta-low.jpg', {
    caption: '<b>Como trocar de cartas com a Giraê?</b>\n\n1. Selecione o card que você quer trocar usando o comando <code>/card</code>\n2. Clique no botão <b>➕ Trocar este card</b>\n3. Quando tiver selecionado todos os cards (3 no máximo), clique no botão <b>🔄 Pronto pra trocar</b>.\n\nEsta mensagem será automaticamente atualizada com os cards de vocês.',
    parse_mode: 'HTML'
  })
  await setUserDisplayMessageID(ctx, m.message_id)
  await _brklyn.telegram.pinChatMessage(ctx.chat!.id, m.message_id)
}
