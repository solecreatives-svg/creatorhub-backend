import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { AuthedRequest, requireAuth } from '../middleware/requireAuth'

export const messagesRouter = Router()

const conversationInclude = {
  messages: { orderBy: { createdAt: 'asc' as const } },
  creator: { select: { id: true, name: true, handle: true, avatarUrl: true } },
} as const

messagesRouter.get('/conversations', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { fanId: req.userId },
      include: conversationInclude,
    })
    res.json(conversations)
  } catch (err) {
    next(err)
  }
})

// Get-or-create a conversation with a creator (called when a fan clicks
// "Message" on a creator profile for the first time).
messagesRouter.post('/conversations', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { creatorId } = req.body as { creatorId: string }
    const conversation = await prisma.conversation.upsert({
      where: { fanId_creatorId: { fanId: req.userId!, creatorId } },
      create: { fanId: req.userId!, creatorId },
      update: {},
      include: conversationInclude,
    })
    res.status(201).json(conversation)
  } catch (err) {
    next(err)
  }
})

messagesRouter.post('/conversations/:id/messages', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { text } = req.body
    const message = await prisma.message.create({
      data: { conversationId: req.params.id, senderId: req.userId!, text },
    })
    res.status(201).json(message)
    // In production, emit this over a WebSocket (Socket.io/Ably/Pusher) to
    // the other participant instead of relying on polling.
  } catch (err) {
    next(err)
  }
})
