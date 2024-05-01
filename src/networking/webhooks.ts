import { FastifyReply, FastifyRequest } from "fastify"
import Stripe from "stripe"
import { cancelSubscription, markDonator, warnOfChargeBack, warnOfFailedPayment } from "../utilities/engine/donation.js"

export const stripeWebhook = async (req: FastifyRequest, res: FastifyReply) => {
  const sig = req.headers['stripe-signature'] as string
  let rawBody: string = req.rawBody as string

  let event: Stripe.Event
  try {
    event = global._brklyn.payments.client.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_SIGNING_SECRET!)
  } catch (err) {
    // @ts-ignore
    return res.status(400).send(`Webhook Error: ${err?.message}`)
  }

  // Handle the event
  switch (event.type) {
    // when the money is in the bank
    case 'customer.subscription.created':
      if (event.data.object.status === 'active') await createDonation(event.data.object.customer as string).catch(console.log)
      break
    case 'customer.subscription.updated':
      if (event.data.object.status === 'past_due') await warnOfFailedPayment(event.data.object.customer as string).catch(console.log)
      if (event.data.object.status === 'canceled') await removeDonation(event.data.object.customer as string).catch(console.log)
      break
    // on chargeback
    case 'charge.dispute.created':
      const chargeId = event.data.object.charge as string
      const charge = await global._brklyn.payments.client.charges.retrieve(chargeId)
      await warnOfChargeBack(charge.customer as string).catch(console.log)
      break
    case 'invoice.payment_succeeded':
      await createDonation(event.data.object.customer as string).catch(console.log)
      break
    case 'invoice.payment_action_required':
      await warnOfFailedPayment(event.data.object.customer as string).catch(console.log)
      break
    case 'invoice.payment_failed':
      await warnOfFailedPayment(event.data.object.customer as string).catch(console.log)
      break
    case 'customer.subscription.deleted':
      await removeDonation(event.data.object.customer as string).catch(console.log)
      break
    // delayed payments: warn if they choose it
    case 'checkout.session.async_payment_succeeded':
      await createDonation(event.data.object.customer as string).catch(console.log)
      break
    default:
      break
  }

  res.send({ received: true })
}

async function createDonation (stripeID: string) {
  const str = await _brklyn.db.stripeCustomer.findFirst({ where: { stripeId: stripeID, beta: !!process.env.RUN_BETA }})
  if (!str) return
  // get user
  const user = await _brklyn.db.user.findFirst({ where: { id: str.userId }})
  if (!user) return

  await markDonator(user.id, user.tgId)
}

async function removeDonation (stripeID: string) {
  const str = await _brklyn.db.stripeCustomer.findFirst({ where: { stripeId: stripeID, beta: !!process.env.RUN_BETA }})
  if (!str) return
  // get user
  const user = await _brklyn.db.user.findFirst({ where: { id: str.userId }})
  if (!user) return

  await cancelSubscription(user.id, user.tgId.toString())
}
