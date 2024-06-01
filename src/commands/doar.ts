import { CommonMessageBundle } from 'telegraf/types.js'
import { BotContext } from '../types/context.js'
import { getUserFromQuotesOrAt } from '../utilities/parser.js'

export default async (ctx: BotContext) => {
  if (false) {
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

📨 Doar cartas usando o comando <i>/doar</i>;
🤝 Fazer trocas simples (<i>/stroca</i>) em qualquer grupo;
🔮 Giros em dobro e acumulo máximo aumentado para <b>24 giros</b>.
💰 Daily <b>em dobro</b>;
🥇 Chances de drop de cartas raras e lendárias aumentadas (<b>apenas 9% a mais</b>).
💎 Acesso a grupo exclusivo e emoji de diamante no perfil;

🤔 <b>Como doar?</b>

Clique no botão abaixo! Você será redirecionado para o site do Stripe, nosso processador de pagamentos seguro. Lá, você poderá escolher sua forma de pagamento. Não teremos acesso a nenhum dado sensível seu, como número de cartão ou informações bancárias.

⚠️ <b>AVISO IMPORTANTE</b>: O reembolso pode ser solicitado em até 7 dias. No entanto, devido nossa política de segurança, sua conta será banida permanente da Giraê.`, {
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
  if (!(ctx.message as CommonMessageBundle).reply_to_message) return ctx.responses.gottaQuote('você quer que receba suas cartas')

  const user = await getUserFromQuotesOrAt(ctx, undefined)
  if (!user) return ctx.responses.replyCouldNotFind('o usuário que você quer realizar a doação de cartas')
  if (user?.id === ctx.from!.id) return ctx.reply('Você não pode doar cartas com você mesmo! 😅')
  if (user.is_bot) return ctx.reply('Você não pode doar cartas para um bot! 😅')

  const nUser = await _brklyn.db.user.findFirst({ where: { tgId: user.id } })
  if (!nUser) return ctx.reply('O usuário mencionado nunca usou a bot! Talvez você marcou a pessoa errada?')
  if (nUser.isBanned && !process.env.JANET_VERSION) return ctx.reply('Esse usuário está banido de usar a Giraê e não pode receber cartas.')

  const ids = ctx.args.map(Number)
  if (ids.length === 0) return ctx.reply('Você precisa especificar o ID da carta que deseja doar. Use /doar id id id...')
  if (ids.some(isNaN)) return ctx.reply('Um dos IDs fornecidos não é um número.')
  if (ids.length > 5) return ctx.reply('Você só pode doar até 5 cartas por vez.')
  const resolvedCards = await _brklyn.db.card.findMany({ where: { id: { in: ids } } })
  if (ids.filter((id) => !resolvedCards.some((c) => c.id === id)).length > 0) return ctx.reply('Uma ou mais cartas não foram encontradas: ' + ids.filter((id) => !resolvedCards.some((c) => c.id === id)).join(', '))

  // check if author has said cards
  let userCardIDs: number[] = []
  for (const card of resolvedCards) {
    const d = await _brklyn.db.userCard.findFirst({ where: { userId: ctx.userData.id, cardId: card.id, id: { notIn: userCardIDs } } })
    if (!d) return ctx.reply(`Você não possui a carta ${card.name} para doar!`)
    userCardIDs.push(d.id)
  }
  if (userCardIDs.length !== ids.length) return ctx.reply('Você não possui todas as cartas que deseja doar.')

  await _brklyn.db.$transaction([
    _brklyn.db.userCard.deleteMany({ where: { id: { in: userCardIDs } } }),
    _brklyn.db.userCard.createMany({ data: ids.map((id) => ({ userId: nUser.id, cardId: id })) })
  ])

  return ctx.reply(`Você doou ${ids.length} carta${ids.length > 1 ? 's' : ''} para ${user.first_name}! 🎁`)
}
