import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { AuthedRequest, requireAuth } from '../middleware/requireAuth'

export const usersRouter = Router()

usersRouter.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, name: true, handle: true, email: true, avatarUrl: true, bio: true,
        role: true, ageVerified: true, idVerificationStatus: true, createdAt: true,
      },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    next(err)
  }
})

usersRouter.patch('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { name, bio, avatarUrl } = req.body
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name, bio, avatarUrl },
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
})

// Switches a FAN account into CREATOR mode (and back). Mirrors the sidebar
// toggle in the frontend. Creates an empty CreatorProfile the first time a
// user switches to CREATOR so /dashboard routes have something to read.
usersRouter.patch('/me/role', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { role } = req.body as { role: 'FAN' | 'CREATOR' }
    if (role !== 'FAN' && role !== 'CREATOR') {
      return res.status(400).json({ error: 'role must be FAN or CREATOR' })
    }

    if (role === 'CREATOR') {
      const existing = await prisma.creatorProfile.findUnique({ where: { userId: req.userId } })
      if (!existing) {
        await prisma.creatorProfile.create({
          data: { userId: req.userId!, category: 'Uncategorized', monthlyPrice: 1000 },
        })
      }
    }

    const user = await prisma.user.update({ where: { id: req.userId }, data: { role } })
    res.json(user)
  } catch (err) {
    next(err)
  }
})
