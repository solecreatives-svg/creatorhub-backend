import { Router } from 'express'

export const paymentsRouter = Router()

// Webhook endpoint your payment processor calls on events (renewal succeeded,
// renewal failed, chargeback, etc.). Every processor has its own signature
// verification scheme — verify it here before trusting the payload.
paymentsRouter.post('/webhook', async (req, res) => {
  const signature = req.headers['x-provider-signature']
  if (!process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET) {
    return res.status(501).json({ error: 'Payment provider not configured yet.' })
  }

  // TODO: verify `signature` against PAYMENT_PROVIDER_WEBHOOK_SECRET using
  // your processor's documented method before acting on `req.body`.
  console.log('Received payment webhook (unverified in this scaffold):', req.body)

  res.status(200).json({ received: true })
})
