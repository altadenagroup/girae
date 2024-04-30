import Stripe from 'stripe'
import { User } from 'telegraf/types.js'

export default class PaymentSystem {
  client = new Stripe(process.env.STRIPE_SECRET_KEY!)

  createCustomer = async (user: User) => {
    return this.client.customers.create({
      description: `${user.first_name} ${user.last_name || ''} (${user.id})`
    })
  }

  createOrGetCustomer = async (user: User, userId: number) => {
    const cst = await _brklyn.db.stripeCustomer.findFirst({ where: { userId, beta: !!process.env.RUN_BETA }})
    if (cst) {
      return cst.stripeId
    }

    const customer = await this.createCustomer(user)
    await _brklyn.db.stripeCustomer.create({
      data: {
        userId,
        beta: !!process.env.RUN_BETA,
        stripeId: customer.id
      }
    })

    return customer.id
  }

  createSessionForProduct = async (customerID: string, productID: string) => {
    return this.client.checkout.sessions.create({
      customer: customerID,
      payment_method_types: ['card'],
      line_items: [
        {
          price: productID,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: 'https://girae-web-app-dev.altadena.space/payments/success',
      cancel_url: 'https://girae-web-app-dev.altadena.space/payments/cancel'
    })
  }

  checkIfCustomerHasActiveSubscription = async (customerID: string) => {
    const subs = await this.client.subscriptions.list({
      customer: customerID,
      status: 'active'
    })

    return subs.data.length > 0
  }
}
