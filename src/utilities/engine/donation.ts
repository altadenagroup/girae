import { reportWithContext } from "../../reporting/index.js"
import { getUserFromNamekeeper } from "../telegram.js"

export const checkIfUserInVIPGroup = async (tgID: number | string) => {
  const d = await _brklyn.telegram.getChatMember(process.env.VIP_GROUP_ID!, tgID as any)
  if (!d) return false
  return d.status === 'member' || d.status === 'creator' || d.status === 'administrator'
}

export const generateVIPGroupInvite = async () => {
  const r = await _brklyn.telegram.createChatInviteLink(process.env.VIP_GROUP_ID!, { member_limit: 1 })
  return r.invite_link
}

export const sendInviteLinkByGiraeID = async (giraeID: number) => {
  const user = await _brklyn.db.user.findFirst({ where: { id: giraeID }})
  if (!user) return
  await sendInviteLinkToUser(user.tgId.toString())
}

export const markDonatorByTgID = async (tgId: number | bigint) => {
  const user = await _brklyn.db.user.findFirst({ where: { tgId }})
  if (!user) return
  await markDonator(user.id, tgId as any)
}

export const markDonator = async (userId: number, tgId: bigint) => {
  // check if user is already a donator
  const donator = await _brklyn.db.donator.findFirst({ where: { userId, cancelled: false }, include: { plan: true, user: true }})
  const tgUser = await getUserFromNamekeeper(tgId.toString())
  if (donator) {
    // if user is already a donator, extend the subscription
    await _brklyn.db.donator.update({ where: { id: donator.id }, data: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }})
    await _brklyn.db.user.update({ where: { id: userId }, data: { isPremium: true, maximumDraws: donator.plan.maximumDraws, luckModifier: donator.plan.userLuckIncrease } })
    await _brklyn.telegram.sendMessage(tgId.toString(), 'Sua doação foi renovada com sucesso! Obrigado por acreditar no nosso trabalho! 💗')
    await reportWithContext(null, 'RENOVAÇÃO_DE_ASSINATURA', tgUser || { first_name: 'Usuário desconhecido', id: tgId.toString() })
    return
  }
  await _brklyn.db.donator.create({ data: { userId, planId: 1, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }})
  const plan = await _brklyn.db.donationPlan.findFirst({ where: { id: 1 }})
  await _brklyn.db.user.update({ where: { id: userId }, data: { isPremium: true, maximumDraws: plan?.maximumDraws ?? 12, luckModifier: plan?.userLuckIncrease ?? 0 } })

  let extra = ''
  const inGroup = await checkIfUserInVIPGroup(tgId.toString())
  if (!inGroup) {
    const inv = await generateVIPGroupInvite()
    extra = `\n\nPara ficar por dentro das novidades antes de todos e ter contato direto com a staff, entre no grupo VIP exclusivo para os usuários premium. 🌟\n${inv}`
  }

  await reportWithContext(null, 'CRIAÇÃO_DE_ASSINATURA', tgUser || { first_name: 'Usuário desconhecido', id: tgId.toString() })
  await _brklyn.telegram.sendMessage(tgId.toString(), 'Muito obrigado por doar para a Giraê! 💗\n\nVocê agora é um membro premium e tem acesso a recursos exclusivos. Obrigado por acreditar no nosso trabalho!\nUse /doar para gerenciar sua assinatura a qualquer momento.' + extra)
}

export const sendInviteLinkToUser = async (tgId: string) => {
  const inv = await generateVIPGroupInvite()
  await _brklyn.telegram.sendMessage(tgId, `Aqui está o link do grupo VIP da Giraê! Novamente, obrigado pelo seu suporte. 🌟\n\n${inv}`)
}

export const kickFromVIPGroup = async (tgId: string) => {
  await _brklyn.telegram.banChatMember(process.env.VIP_GROUP_ID!, parseInt(tgId)).then(() => {
    return _brklyn.telegram.unbanChatMember(process.env.VIP_GROUP_ID!, parseInt(tgId))
  })
}

export const cancelSubscription = async (giraeID: number, tgID: string) => {
  // if user has no active subscriptions, return
  const donator = await _brklyn.db.donator.findFirst({ where: { userId: giraeID, cancelled: false }})
  if (!donator) return
  const tgUser = await getUserFromNamekeeper(tgID.toString())
  // get all subscriptions and mark them as cancelled
  await _brklyn.db.donator.updateMany({ where: { userId: giraeID, cancelled: false }, data: { cancelled: true }})
  await _brklyn.db.user.update({ where: { id: giraeID }, data: { isPremium: false, maximumDraws: 12, luckModifier: 0 } })
  await kickFromVIPGroup(tgID).catch(() => 0)
  await reportWithContext(null, 'CANCELAMENTO_DE_ASSINATURA', tgUser || { first_name: 'Usuário desconhecido', id: tgID })
  await _brklyn.telegram.sendMessage(tgID, 'Seu plano expirou. Obrigado por apoiar a Giraê! 💗\n\nLembre-se que você pode sempre doar novamente usando /doar.')
}

export const warnOfFailedPayment = async (stripeId: string) => {
  const customer = await _brklyn.db.stripeCustomer.findFirst({ where: { stripeId }})
  if (!customer) return
  const gUser = await _brklyn.db.user.findFirst({ where: { id: customer.userId }})
  if (!gUser) return
  const tgUser = await getUserFromNamekeeper(gUser.tgId.toString())

  if (!gUser?.isPremium) {
    return _brklyn.telegram.sendMessage(gUser.tgId.toString(), '⚠️ Atenção: não foi possível assinar o plano premium. Por favor, verifique se o seu cartão de crédito está válido e tente novamente.')
  }

  await reportWithContext(null, 'FALHA_NA_RENOVAÇÃO_DA_ASSINATURA', tgUser || { first_name: 'Usuário desconhecido', id: gUser.tgId })
  await _brklyn.telegram.sendMessage(gUser.tgId.toString(), `⚠️ Atenção: não foi possível renovar sua assinatura automaticamente.
Por favor, verifique se o seu cartão de crédito está válido e tente novamente.

Tentarei mais algumas vezes, porém, caso o problema persista durante 7 dias, sua assinatura será cancelada automaticamente.
<a href="https://billing.stripe.com/p/login/3cs2b55ztfVYfny000">Atualize suas informações de pagamento clicando aqui.</a>`, { parse_mode: 'HTML' })
}

export const warnOfChargeBack = async (stripeId: string) => {
  const customer = await _brklyn.db.stripeCustomer.findFirst({ where: { stripeId }})
  if (!customer) return

  const gUser = await _brklyn.db.user.findFirst({ where: { id: customer.userId }})
  if (!gUser) return

  // mark user as not premium anymore
  await _brklyn.db.user.update({ where: { id: gUser.id },
    data: {
      isPremium: false,
      maximumDraws: 12,
      luckModifier: 0,
      isBanned: true,
      banMessage: 'Contestação de pagamento - possível atividade fraudulenta.'
    }
  })

  // get all subscriptions and mark them as cancelled
  await _brklyn.db.donator.updateMany({ where: { userId: gUser.id, cancelled: false }, data: { cancelled: true }})
  await kickFromVIPGroup(gUser.tgId.toString()).catch(() => 0)
  // ban user from the bot

  return _brklyn.telegram.sendMessage(gUser.tgId.toString(), '⚠️ Atenção: sua assinatura foi cancelada devido a uma contestação de pagamento. Se você acredita que isso foi um erro, por favor, entre em contato conosco através do suporte em @giraesuportebot.\n\nA Giraê e sua administração não toleram atividades fraudulentas e tomam medidas ativas para proteger a comunidade. Desta forma, sua conta foi banida preventivamente. Entre em contato com nosso suporte urgentemente.')
}
