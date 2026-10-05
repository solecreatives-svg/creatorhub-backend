import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { AuthedRequest, requireAuth } from '../middleware/requireAuth'
import { tokenizeCard } from '../services/paymentProvider'

export const paymentMethodsRouter = Router()

paymentMethodsRouter.get('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const methods = await prisma.paymentMethod.findMany({ where: { userId: req.userId } })
    res.json(methods)
  } catch (err) {
    next(err)
  }
})

// NOTE: in a real app the raw card number/CVC should never reach this
// server at all — you'd collect them client-side with your payment
// processor's hosted fields/SDK, which hands you back a token. This route
// takes a pre-tokenized card for that reason; see services/paymentProvider.ts.
paymentMethodsRouter.post('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { providerToken, brand, last4, expMonth, expYear } = req.body
    const token = await tokenizeCard(providerToken)

    const existingCount = await prisma.paymentMethod.count({ where: { userId: req.userId } })
    const method = await prisma.paymentMethod.create({
      data: {
        userId: req.userId!,
        brand, last4, expMonth, expYear,
        providerRef: token.providerRef,
        isDefault: existingCount === 0,
      },
    })
    res.status(201).json(method)
  } catch (err) {
    next(err)
  }
})

paymentMethodsRouter.patch('/:id/default', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    await prisma.paymentMethod.updateMany({ where: { userId: req.userId }, data: { isDefault: false } })
    const method = await prisma.paymentMethod.update({
      where: { id: req.params.id },
      data: { isDefault: true },
    })
    res.json(method)
  } catch (err) {
    next(err)
  }
})

paymentMethodsRouter.delete('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const method = await prisma.paymentMethod.findUnique({ where: { id: req.params.id } })
    if (!method || method.userId !== req.userId) return res.status(404).json({ error: 'Not found' })
    await prisma.paymentMethod.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
