import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: { userId: string; role: string }) {
  const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  return jwt.sign(payload, JWT_SECRET, options)
}

export function verifyToken(token: string): { userId: string; role: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
}
