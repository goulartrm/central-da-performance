import type { FastifyRequest, FastifyReply } from 'fastify'

export interface AuthUser {
  id: string
  email: string
  organization_id: string
  role: string
}

// Check if user is superadmin (admin role + @vetorimobi.com.br email)
export function isSuperAdmin(user: AuthUser): boolean {
  return user.role === 'admin' && user.email?.toLowerCase().endsWith('@vetorimobi.com.br')
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      })
    }

    const token = authHeader.substring(7)
    const decoded = await request.server.jwt.verify(token)

    if (!decoded || typeof decoded !== 'object') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token',
      })
    }

    request.user = decoded as AuthUser
  } catch (error) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    })
  }
}
