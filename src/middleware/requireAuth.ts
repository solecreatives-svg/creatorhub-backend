import { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../utils/auth'

export interface AuthedRequest extends Request {
  userId?: string
  userRole?: string
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  try {
    const payload = verifyToken(header.slice('Bearer '.length))
    req.userId = payload.userId
    req.userRole = payload.role
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(role: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (req.userRole !== role && req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: `Requires ${role} role` })
    }
    next()
  }
}
