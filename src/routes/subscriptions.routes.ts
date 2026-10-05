import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { AuthedRequest, requireAuth } from '../middleware/requireAuth'
import { chargeSubscription } from '../services/paymentProvider'

export const subscriptionsRouter = Router()

subscriptionsRouter.get('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const subs = await prisma.subscription.findMany({
      where: { fanId: req.userId, status: 'ACTIVE' },
      include: {
        creator: { include: { user: { select: { id: true, name: true, handle: true, avatarUrl: true } } } },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    })
    res.json(subs)
  } catch (err) {
    next(err)
  }
})

// `creatorUserId` here is the creator's User.id (same id used everywhere
// else on the frontend for a creator) — we resolve it to the underlying
// CreatorProfile row to get pricing and the FK Subscription.creatorId expects.
subscriptionsRouter.post('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { creatorUserId, paymentMethodId } = req.body
    const creator = await prisma.creatorProfile.findUnique({ where: { userId: creatorUserId } })
    if (!creator) return res.status(404).json({ error: 'Creator not found' })

    // Real charge happens through the adult-approved payment processor —
    // see services/paymentProvider.ts. This must succeed before we create
    // an active subscription record.
    const charge = await chargeSubscription({
      userId: req.userId!,
      paymentMethodId,
      amountCents: creator.monthlyPrice,
    })

    const subscription = await prisma.subscription.create({
      data: {
        fanId: req.userId!,
        creatorId: creator.id,
        priceCents: creator.monthlyPrice,
        status: 'ACTIVE',
      },
    })

    await prisma.transaction.create({
      data: {
        subscriptionId: subscription.id,
        amountCents: creator.monthlyPrice,
        platformFeeCents: Math.round(creator.monthlyPrice * 0.15),
        provider: charge.provider,
        providerRef: charge.providerRef,
      },
    })

    res.status(201).json(subscription)
  } catch (err) {
    next(err)
  }
})

// Cancels by the creator's User.id, matching how the frontend tracks
// subscriptions (as a list of creator user ids), rather than requiring the
// frontend to know the internal Subscription row id.
subscriptionsRouter.delete('/:creatorUserId', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({ where: { userId: req.params.creatorUserId } })
    if (!creator) return res.status(404).json({ error: 'Creator not found' })

    const sub = await prisma.subscription.findUnique({
      where: { fanId_creatorId: { fanId: req.userId!, creatorId: creator.id } },
    })
    if (!sub) return res.status(404).json({ error: 'Subscription not found' })

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
