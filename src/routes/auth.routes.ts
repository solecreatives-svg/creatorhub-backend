import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { hashPassword, signToken, verifyPassword } from '../utils/auth'

export const authRouter = Router()

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['FAN', 'CREATOR']).default('FAN'),
})

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body)
    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    const handle = body.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || `user${Date.now()}`
    const passwordHash = await hashPassword(body.password)

    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash, role: body.role, handle },
    })

    // If registering as a creator, also create the (empty) creator profile.
    if (body.role === 'CREATOR') {
      await prisma.creatorProfile.create({
        data: { userId: user.id, category: 'Uncategorized', monthlyPrice: 1000 },
      })
    }

    const token = signToken({ userId: user.id, role: user.role })
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    next(err)
  }
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const valid = await verifyPassword(body.password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    const token = signToken({ userId: user.id, role: user.role })
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    next(err)
  }
})
