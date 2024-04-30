export const markDonator = async (userId: number, tgId: bigint) => {
  await _brklyn.db.donator.create({ data: { userId, planId: 1, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }})
  const plan = await _brklyn.db.donationPlan.findFirst({ where: { id: 1 }})
  await _brklyn.db.user.update({ where: { id: userId }, data: { isPremium: true, maximumDraws: plan?.maximumDraws ?? 12 }})
  await _brklyn.telegram.sendMessage(tgId.toString(), 'Muito obrigado por doar para a Giraê! 💗\n\nVocê agora é um membro premium e tem acesso a recursos exclusivos. Obrigado por acreditar no nosso trabalho!')
}
