import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { AuthedRequest, requireAuth } from '../middleware/requireAuth'
import { queueCsamScan } from '../services/contentSafety'

export const postsRouter = Router()

// Creator uploads a post. It is created in a hidden state — NOT visible to
// anyone — until both moderationStatus and csamScanStatus clear. See
// services/contentSafety.ts for where the real scanning vendor plugs in.
postsRouter.post('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (req.userRole !== 'CREATOR') return res.status(403).json({ error: 'Creator role required' })

    const creator = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!creator?.ageVerified || creator.idVerificationStatus !== 'VERIFIED') {
      return res.status(403).json({
        error: 'Identity/age verification must be complete before publishing content.',
      })
    }

    const { type, caption, mediaUrl, locked } = req.body
    const post = await prisma.post.create({
      data: {
        creatorId: req.userId!,
        type,
        caption,
        mediaUrl,
        locked: locked ?? true,
        // Explicitly pending — never default content to visible.
        moderationStatus: 'PENDING',
        csamScanStatus: 'PENDING',
      },
    })

    if (mediaUrl) {
      // Fire-and-forget in this scaffold; in production this should be a
      // queued background job (BullMQ) that updates csamScanStatus on the
      // post once the vendor callback comes back.
      queueCsamScan(post.id, mediaUrl).catch((err) => console.error('CSAM scan queue failed', err))
    }

    res.status(201).json(post)
  } catch (err) {
    next(err)
  }
})

// Public/subscriber feed — only ever returns posts that passed both gates.
postsRouter.get('/', async (req, res, next) => {
  try {
    const creatorId = typeof req.query.creatorId === 'string' ? req.query.creatorId : undefined
    const posts = await prisma.post.findMany({
      where: {
        creatorId,
        moderationStatus: 'APPROVED',
        csamScanStatus: 'CLEAR',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true, name: true, handle: true, avatarUrl: true,
            creatorProfile: { select: { monthlyPrice: true } },
          },
        },
      },
    })
    res.json(posts)
  } catch (err) {
    next(err)
  }
})

// Creator's own dashboard view — unlike GET /, this returns ALL of the
// creator's own posts regardless of moderation/scan status, so they can see
// what's pending vs. live. Must come before /:id-style routes if any are
// added later.
postsRouter.get('/mine', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (req.userRole !== 'CREATOR') return res.status(403).json({ error: 'Creator role required' })
    const posts = await prisma.post.findMany({
      where: { creatorId: req.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(posts)
  } catch (err) {
    next(err)
  }
})

postsRouter.delete('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } })
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (post.creatorId !== req.userId) return res.status(403).json({ error: 'Not your post' })
    await prisma.post.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// Internal/admin-only: called once moderation review is complete.
// Lock this route down to admin users / an internal service token in production.
postsRouter.post('/:id/moderate', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Admin only' })
    const { decision } = req.body as { decision: 'APPROVED' | 'REJECTED' }
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { moderationStatus: decision },
    })
    res.json(post)
  } catch (err) {
    next(err)
  }
})
