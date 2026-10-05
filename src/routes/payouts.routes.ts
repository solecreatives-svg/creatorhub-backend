import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { AuthedRequest, requireAuth } from '../middleware/requireAuth'
import { initiatePayout, linkPayoutAccount } from '../services/paymentProvider'

export const payoutsRouter = Router()

payoutsRouter.post('/bank-account', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const profile = await prisma.creatorProfile.findUnique({ where: { userId: req.userId } })
    if (!profile) return res.status(403).json({ error: 'Creator profile required' })

    const { providerToken, bankName, accountHolder, last4 } = req.body
    const token = await linkPayoutAccount(providerToken)

    const bankAccount = await prisma.bankAccount.upsert({
      where: { creatorProfileId: profile.id },
      create: { creatorProfileId: profile.id, bankName, accountHolder, last4, providerRef: token.providerRef },
      update: { bankName, accountHolder, last4, providerRef: token.providerRef },
    })
    res.status(201).json(bankAccount)
  } catch (err) {
    next(err)
  }
})

payoutsRouter.get('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const profile = await prisma.creatorProfile.findUnique({ where: { userId: req.userId } })
    if (!profile) return res.status(403).json({ error: 'Creator profile required' })
    const payouts = await prisma.payout.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { requestedAt: 'desc' },
    })
    res.json(payouts)
  } catch (err) {
    next(err)
  }
})

// Computes available balance as (creator's cut of all transactions) minus
// (payouts already paid or in flight). This is a simple running total for
// the scaffold — a real implementation would also model settlement delay
// per your payment processor's terms (funds usually aren't "available"
// the instant a subscription charge succeeds).
payoutsRouter.get('/summary', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: req.userId },
      include: { bankAccount: true },
    })
    if (!profile) return res.status(403).json({ error: 'Creator profile required' })

    const subs = await prisma.subscription.findMany({
      where: { creatorId: profile.id },
      include: { transactions: true },
    })
    const totalEarnedCents = subs
      .flatMap((s: any) => s.transactions)
      .reduce((sum: number, t: any) => sum + (t.amountCents - t.platformFeeCents), 0)

    const paidOut = await prisma.payout.aggregate({
      where: { creatorProfileId: profile.id, status: { in: ['PAID', 'PROCESSING'] } },
      _sum: { amountCents: true },
    })

    const availableCents = totalEarnedCents - (paidOut._sum.amountCents || 0)

    res.json({
      availableCents: Math.max(availableCents, 0),
      totalEarnedCents,
      bankAccount: profile.bankAccount,
      minimumPayoutCents: 2000,
    })
  } catch (err) {
    next(err)
  }
})

payoutsRouter.post('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { amountCents } = req.body
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: req.userId },
      include: { bankAccount: true },
    })
    if (!profile) return res.status(403).json({ error: 'Creator profile required' })
    if (!profile.bankAccount) return res.status(400).json({ error: 'Link a bank account before withdrawing.' })

    const payout = await prisma.payout.create({
      data: { creatorProfileId: profile.id, amountCents, status: 'PROCESSING' },
    })

    try {
      const result = await initiatePayout({
        bankAccountProviderRef: profile.bankAccount.providerRef,
        amountCents,
      })
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'PAID', providerRef: result.providerRef, paidAt: new Date() },
      })
    } catch (payoutErr) {
      await prisma.payout.update({ where: { id: payout.id }, data: { status: 'FAILED' } })
      throw payoutErr
    }

    res.status(201).json(payout)
  } catch (err) {
    next(err)
  }
})
