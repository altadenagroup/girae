import Stripe from 'stripe'

export default class PaymentSystem {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

}
