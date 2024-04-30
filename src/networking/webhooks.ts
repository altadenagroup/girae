import { FastifyReply, FastifyRequest } from "fastify"
import Stripe from "stripe"
import { markDonator } from "../utilities/engine/donation"

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
    case 'checkout.session.completed':
      const session = event.data.object
      // get user id from customer id
      const str = await _brklyn.db.stripeCustomer.findFirst({ where: { stripeId: session.customer as string, beta: !!process.env.RUN_BETA }})
      if (!str) return res.send({ received: true })
      // get user
      const user = await _brklyn.db.user.findFirst({ where: { id: str.userId }})
      if (!user) return res.send({ received: true })

      await markDonator(user.id, user.tgId)
      break
    // delayed payments: warn if they choose it
    case 'checkout.session.async_payment_succeeded':
      const sessio = event.data.object
      const st = await _brklyn.db.stripeCustomer.findFirst({ where: { stripeId: sessio.customer as string, beta: !!process.env.RUN_BETA }})
      if (!st) return res.send({ received: true })
      // get user
      const usera = await _brklyn.db.user.findFirst({ where: { id: st.userId }})
      if (!usera) return res.send({ received: true })

      await markDonator(usera.id, usera.tgId)
      break
    default:
      break
  }

  res.send({ received: true })
}
