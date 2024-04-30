import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  if (!ctx.userData.isPremium) {
    if (ctx.chat!.type !== 'private') return ctx.reply('Somente usuários doadores podem usar esse comando. Use /doar na DM para saber mais!')
    const customer = await _brklyn.payments.createOrGetCustomer(ctx.from, ctx.userData.id)
  // TODO: add abstraction for this
    const plan = await _brklyn.db.donationPlan.findFirst({ where: { id: 1 }})
    if (!plan) return ctx.reply('O plano de doação não foi encontrado. Por favor, contate um administrador.')
    const session = await _brklyn.payments.createSessionForProduct(customer, process.env.RUN_BETA ? plan.stripeTestProductID : plan.stripeProductID)
    if (!session) return ctx.reply('Ocorreu um erro ao criar a sessão de pagamento. Por favor, contate um administrador.')

    await ctx.replyWithHTML(`<b> 💗 Doar para a Giraê</b>
  Obrigado por considerar ajudar o desenvolvimento da bot! Sua contribuição é valiosa para o bom funcionamento e desenvolvimento do projeto.

  As doações da bot funcionam de modo <b>mensal</b>. Ao se tornar doador, você terá diversos benefícios, como:
  - doar cartas usando o comando /doar;
  - fazer trocas simples (/stroca) em qualquer grupo;
  - descontos na loja;
  - acesso a grupos exclusivos;
  - e muito mais!

  <b>🤔 Como doar?</b>
  Clique no botão abaixo! Você será redirecionado para o site do Stripe, nosso processador de pagamentos seguro. Lá, você poderá escolher sua forma de pagamento.
  Não teremos acesso a nenhum dado sensível seu, como número de cartão ou informações bancárias.`, {
      reply_markup: {
        inline_keyboard: [
          [{
            text: `🎁 Doar R$${plan?.price}/mês`,
            url: session.url!
          }]
        ]
      }
    })
  }

  const ids = ctx.args.map(Number)
  if (ids.length === 0) return ctx.reply('Você precisa especificar o ID da carta que deseja doar. Use /doar id id id...')
  if (ids.some(isNaN)) return ctx.reply('Um dos IDs fornecidos não é um número.')
  if (ids.length > 5) return ctx.reply('Você só pode doar até 5 cartas por vez.')

    console.log('ficará pronto amanhã!')
}
