import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { AuthedRequest, requireAuth } from '../middleware/requireAuth'

export const notificationsRouter = Router()

notificationsRouter.get('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(notifications)
  } catch (err) {
    next(err)
  }
})

notificationsRouter.patch('/read-all', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, read: false },
      data: { read: true },
    })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
