export const checkIfUserInVIPGroup = async (tgID: number) => {
  const d = await _brklyn.telegram.getChatMember(process.env.VIP_GROUP_ID!, tgID)
  return d.status === 'member' || d.status === 'creator' || d.status === 'administrator' || d.status === 'left'
}

export const generateVIPGroupInvite = async () => {
  const r = await _brklyn.telegram.createChatInviteLink(process.env.VIP_GROUP_ID!, { member_limit: 1 })
  return r.invite_link
}

export const markDonator = async (userId: number, tgId: bigint) => {
  await _brklyn.db.donator.create({ data: { userId, planId: 1, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }})
  const plan = await _brklyn.db.donationPlan.findFirst({ where: { id: 1 }})
  await _brklyn.db.user.update({ where: { id: userId }, data: { isPremium: true, maximumDraws: plan?.maximumDraws ?? 12 }})

  let extra = ''
  const isMember = await checkIfUserInVIPGroup(tgId as unknown as number)
  if (!isMember) {
    const inv = await generateVIPGroupInvite()
    extra = `\n\nPara ficar por dentro das novidades antes de todos e ter contato direto com a staff, entre no grupo VIP, exclusivo aos usuários premium. 🌟\n${inv}`
  }

  await _brklyn.telegram.sendMessage(tgId.toString(), 'Muito obrigado por doar para a Giraê! 💗\n\nVocê agora é um membro premium e tem acesso a recursos exclusivos. Obrigado por acreditar no nosso trabalho!' + extra)
}
