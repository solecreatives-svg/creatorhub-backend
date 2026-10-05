import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { AuthedRequest, requireAuth } from '../middleware/requireAuth'

export const creatorsRouter = Router()

// NOTE on IDs: every creator-facing route in this file (and posts.routes.ts,
// messages.routes.ts) identifies a creator by their **User.id**, not their
// CreatorProfile.id. The frontend only ever sees/uses User.id for creators
// (it's what shows up in posts, messages, and profile links). Internally we
// still resolve to the CreatorProfile row where needed (e.g. for pricing).

const creatorInclude = {
  user: { select: { id: true, name: true, handle: true, avatarUrl: true, bio: true } },
  _count: { select: { subscribers: true } },
} as const

// Public: browse creators (Explore page)
creatorsRouter.get('/', async (req, res, next) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined
    const creators = await prisma.creatorProfile.findMany({
      where: category ? { category } : undefined,
      include: creatorInclude,
    })
    res.json(creators)
  } catch (err) {
    next(err)
  }
})

// Creator-only: fetch own profile (must come before the /:userId route
// below, otherwise Express would try to look up a creator with id "me").
creatorsRouter.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (req.userRole !== 'CREATOR') return res.status(403).json({ error: 'Creator role required' })
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: req.userId },
      include: creatorInclude,
    })
    if (!profile) return res.status(404).json({ error: 'Creator profile not found' })
    res.json(profile)
  } catch (err) {
    next(err)
  }
})

// Creator-only: update own profile/pricing
creatorsRouter.patch('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (req.userRole !== 'CREATOR') return res.status(403).json({ error: 'Creator role required' })
    const { category, monthlyPrice, coverUrl } = req.body
    const profile = await prisma.creatorProfile.update({
      where: { userId: req.userId },
      data: { category, monthlyPrice, coverUrl },
    })
    res.json(profile)
  } catch (err) {
    next(err)
  }
})

// Public: single creator profile, looked up by the creator's User.id.
creatorsRouter.get('/:userId', async (req, res, next) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.params.userId },
      include: creatorInclude,
    })
    if (!creator) return res.status(404).json({ error: 'Creator not found' })
    res.json(creator)
  } catch (err) {
    next(err)
  }
})
