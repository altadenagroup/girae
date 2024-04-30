import { CommonMessageBundle } from 'telegraf/types.js'
import { BotContext } from '../types/context.js'
import { getUserFromQuotesOrAt } from '../utilities/parser.js'

export default async (ctx: BotContext) => {
  if (!ctx.userData.isPremium) {
    if (ctx.chat!.type !== 'private') return ctx.reply('Somente usuários doadores podem usar esse comando. Use /doar na DM para saber mais!')
    const customer = await _brklyn.payments.createOrGetCustomer(ctx.from, ctx.userData.id)
    // TODO: add abstraction for this
    const plan = await _brklyn.db.donationPlan.findFirst({ where: { id: 1 } })
    if (!plan) return ctx.reply('O plano de doação não foi encontrado. Por favor, contate um administrador.')
    const session = await _brklyn.payments.createSessionForProduct(customer, process.env.RUN_BETA ? plan.stripeTestProductID : plan.stripeProductID)
    if (!session) return ctx.reply('Ocorreu um erro ao criar a sessão de pagamento. Por favor, contate um administrador.')

    return await ctx.replyWithHTML(`💗 <b>Doar para a Giraê</b>

Obrigado por considerar ajudar o desenvolvimento da bot! Sua contribuição é valiosa para o bom funcionamento e desenvolvimento do projeto.

As doações da bot funcionam de modo <b>mensal</b>. Ao se tornar doador, você terá diversos benefícios, como:

— doar cartas usando o comando <i>/doar</i>;
— fazer trocas simples (<i>/stroca</i>) em qualquer grupo;
— acumulo máximo de giros para <b>24 + giros em dobro</b> a cada 3 horas.
— descontos na loja;
— acesso a grupo exclusivo;
— e muito mais!

🤔 <b>Como doar?</b>

Clique no botão abaixo! Você será redirecionado para o site do <b>Stripe</b>, nosso processador de pagamentos seguro. Lá, você poderá escolher sua forma de pagamento.

<i>Não teremos acesso a nenhum dado sensível seu, como número de cartão ou informações bancárias.</i>`, {
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
  if (ctx.chat!.type === 'private') return ctx.replyWithHTML('Você já é assinante premium! 😊\n\nPara modificar sua assinatura, <a href="https://billing.stripe.com/p/login/3cs2b55ztfVYfny000">clique aqui</a>.')
  if (!(ctx.message as CommonMessageBundle).reply_to_message) return ctx.responses.gottaQuote('quem você quer suque receba suas cartas')

    const user = await getUserFromQuotesOrAt(ctx, ctx.args[0])
  if (!user) return ctx.responses.replyCouldNotFind('o usuário que você quer realizar a doação de cartas')
  if (user?.id === ctx.from!.id) return ctx.reply('Você não pode doar cartas com você mesmo! 😅')
  if (user.is_bot) return ctx.reply('Você não pode doar cartas para um bot! 😅')

    const nUser = await _brklyn.db.user.findFirst({ where: { tgId: user.id } })
  if (!nUser) return ctx.reply('O usuário mencionado nunca usou a bot! Talvez você marcou a pessoa errada?')
  if (nUser.isBanned) return ctx.reply('Esse usuário está banido de usar a Giraê e não pode receber cartas.')

  const ids = ctx.args.map(Number)
  if (ids.length === 0) return ctx.reply('Você precisa especificar o ID da carta que deseja doar. Use /doar id id id...')
  if (ids.some(isNaN)) return ctx.reply('Um dos IDs fornecidos não é um número.')
  if (ids.length > 5) return ctx.reply('Você só pode doar até 5 cartas por vez.')
  const resolvedCards = await _brklyn.db.card.findMany({ where: { id: { in: ids } } })
  if (resolvedCards.length !== ids.length) return ctx.reply('Uma ou mais cartas não foram encontradas: ' + ids.filter((id) => !resolvedCards.some((c) => c.id === id)).join(', '))
}
