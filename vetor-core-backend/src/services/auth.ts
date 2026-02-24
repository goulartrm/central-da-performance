import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { User } from '../db/schema.js'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function generateToken(fastify: FastifyInstance, user: Pick<User, 'id' | 'email' | 'organization_id' | 'role'>): Promise<string> {
  return fastify.jwt.sign({
    id: user.id,
    email: user.email,
    organization_id: user.organization_id,
    role: user.role,
  })
}

export async function verifyToken(fastify: FastifyInstance, token: string): Promise<{ id: string; email: string; organization_id: string; role: string } | null> {
  try {
    const decoded = await fastify.jwt.verify(token)
    return decoded as { id: string; email: string; organization_id: string; role: string }
  } catch {
    return null
  }
}
