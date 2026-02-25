import type { FastifyInstance } from 'fastify'
import { db, withRetry } from '../db/index.js'
import { users, organizations } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword, generateToken } from '../services/auth.js'
import { randomUUID } from 'crypto'
import type { AuthUser } from '../middleware/auth.js'

interface RegisterBody {
  email: string
  password: string
  organization_name?: string
}

interface LoginBody {
  email: string
  password: string
}

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register - Register with email/password
  fastify.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    try {
      const { email, password, organization_name } = request.body

      if (!email || !password) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Email and password are required',
        })
      }

      // Enhanced password validation
      if (password.length < 12) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Password must be at least 12 characters long',
        })
      }

      // Check for password complexity
      const hasUpperCase = /[A-Z]/.test(password)
      const hasLowerCase = /[a-z]/.test(password)
      const hasNumber = /[0-9]/.test(password)

      if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Password must contain uppercase, lowercase, and numbers',
        })
      }

      // Check if user already exists
      const [existingUser] = await withRetry(() =>
        db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)
      )

      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists',
        })
      }

      // Create or get organization
      let organizationId: string

      if (organization_name) {
        const [newOrg] = await withRetry(() =>
          db
            .insert(organizations)
            .values({
              name: organization_name,
            })
            .returning()
        )
        organizationId = newOrg.id
      } else {
        // Use a default organization or create one
        const [defaultOrg] = await withRetry(() =>
          db
            .insert(organizations)
            .values({
              name: email.split('@')[0] + "'s Organization",
            })
            .returning()
        )
        organizationId = defaultOrg.id
      }

      // Hash password
      const passwordHash = await hashPassword(password)

      // Create user
      const userId = randomUUID()
      const [newUser] = await withRetry(() =>
        db
          .insert(users)
          .values({
            id: userId,
            email,
            password_hash: passwordHash,
            organization_id: organizationId,
            role: 'gestor',
            auth_provider: 'local',
          })
          .returning()
      )

      // Generate token
      const token = await generateToken(fastify, newUser)

      return reply.status(201).send({
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          organization_id: newUser.organization_id,
          role: newUser.role,
        },
        token,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to register user',
      })
    }
  })

  // POST /api/auth/login - Login and return JWT token
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    try {
      const { email, password } = request.body

      if (!email || !password) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Email and password are required',
        })
      }

      // Find user
      const [user] = await withRetry(() =>
        db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)
      )

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        })
      }

      // Check if user has password authentication
      if (!user.password_hash) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'This account uses a different authentication method',
        })
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password_hash)

      if (!isValidPassword) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        })
      }

      // Generate token
      const token = await generateToken(fastify, user)

      return reply.send({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          organization_id: user.organization_id,
          role: user.role,
        },
        token,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to login',
      })
    }
  })

  // GET /api/auth/me - Get current user (protected route)
  fastify.get('/me', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        })
      }
      try {
        const token = authHeader.substring(7)
        const decoded = await request.server.jwt.verify(token) as AuthUser
        ;(request as { user?: AuthUser }).user = decoded
      } catch {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        })
      }
    }]
  }, async (request, reply) => {
    try {
      const authUser = (request as { user?: AuthUser }).user
      if (!authUser) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      const [user] = await withRetry(() =>
        db
          .select({
            id: users.id,
            email: users.email,
            organization_id: users.organization_id,
            role: users.role,
            auth_provider: users.auth_provider,
            created_at: users.created_at,
          })
          .from(users)
          .where(eq(users.id, authUser.id))
          .limit(1)
      )

      if (!user) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'User not found',
        })
      }

      return reply.send({ user })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch user',
      })
    }
  })

  // GET /api/auth/debug-token - Debug endpoint to see JWT contents
  fastify.get('/debug-token', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        })
      }
      try {
        const token = authHeader.substring(7)
        const decoded = await request.server.jwt.verify(token) as AuthUser
        ;(request as { user?: AuthUser }).user = decoded
      } catch {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        })
      }
    }]
  }, async (request, reply) => {
    try {
      const authUser = (request as { user?: AuthUser }).user
      if (!authUser) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      return reply.send({
        jwt: authUser,
        isSuperAdmin: authUser.role === 'admin' && authUser.email?.toLowerCase().endsWith('@vetorimobi.com.br'),
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to debug token',
      })
    }
  })

  // POST /api/auth/get-backend-token - Get backend JWT using email from Neon Auth
  // This accepts an email (which the frontend gets from Neon Auth) and returns a backend JWT
  fastify.post('/get-backend-token', async (request, reply) => {
    try {
      const body = request.body as { email: string; name?: string }
      const { email } = body

      if (!email) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Email is required',
        })
      }

      const userEmail = email.toLowerCase().trim()

      // Check if user exists in our database
      const [existingUser] = await withRetry(() =>
        db
          .select()
          .from(users)
          .where(eq(users.email, userEmail))
          .limit(1)
      )

      if (!existingUser) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'User not found. Please contact an administrator to create your account.',
        })
      }

      // If user has @vetorimobi.com.br email and role is not admin, upgrade to admin
      if (userEmail.endsWith('@vetorimobi.com.br') && existingUser.role !== 'admin') {
        await withRetry(() =>
          db
            .update(users)
            .set({ role: 'admin' })
            .where(eq(users.id, existingUser.id))
        )
        existingUser.role = 'admin'
      }

      // User exists - generate backend JWT token
      const tokenUser: AuthUser = {
        id: existingUser.id,
        email: existingUser.email,
        organization_id: existingUser.organization_id,
        role: existingUser.role,
      }

      const token = await generateToken(fastify, tokenUser)

      return reply.send({
        token,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          organization_id: existingUser.organization_id,
          role: existingUser.role,
        },
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to get backend token',
      })
    }
  })

  // POST /api/auth/exchange-token - Alias for get-backend-token (backwards compatibility)
  fastify.post('/exchange-token', async (request, reply) => {
    try {
      const body = request.body as { neonToken?: string; email?: string; name?: string }
      const { email } = body

      if (!email) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Email is required',
        })
      }

      const userEmail = email.toLowerCase().trim()

      // Check if user exists in our database
      const [existingUser] = await withRetry(() =>
        db
          .select()
          .from(users)
          .where(eq(users.email, userEmail))
          .limit(1)
      )

      if (!existingUser) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'User not found. Please contact an administrator to create your account.',
        })
      }

      // If user has @vetorimobi.com.br email and role is not admin, upgrade to admin
      if (userEmail.endsWith('@vetorimobi.com.br') && existingUser.role !== 'admin') {
        await withRetry(() =>
          db
            .update(users)
            .set({ role: 'admin' })
            .where(eq(users.id, existingUser.id))
        )
        existingUser.role = 'admin'
      }

      // User exists - generate backend JWT token
      const tokenUser: AuthUser = {
        id: existingUser.id,
        email: existingUser.email,
        organization_id: existingUser.organization_id,
        role: existingUser.role,
      }

      const token = await generateToken(fastify, tokenUser)

      return reply.send({
        token,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          organization_id: existingUser.organization_id,
          role: existingUser.role,
        },
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to exchange token',
      })
    }
  })

  // POST /api/auth/register-superadmin - Register as superadmin (only @vetorimobi.com.br)
  fastify.post('/register-superadmin', async (request, reply) => {
    try {
      const body = request.body as { email: string; password: string }
      const { email, password } = body

      if (!email || !password) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Email and password are required',
        })
      }

      // Enhanced password validation
      if (password.length < 12) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Password must be at least 12 characters long',
        })
      }

      // Check for password complexity
      const hasUpperCase = /[A-Z]/.test(password)
      const hasLowerCase = /[a-z]/.test(password)
      const hasNumber = /[0-9]/.test(password)

      if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Password must contain uppercase, lowercase, and numbers',
        })
      }

      // Check email domain with proper validation
      const normalizedEmail = email.trim().toLowerCase()

      // Check for null bytes and injection attempts
      if (/\0|\n|\r/.test(normalizedEmail)) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Invalid email format',
        })
      }

      // Strict email validation - must match exact domain
      const emailRegex = /^[^\s@]+@vetorimobi\.com\.br$/
      if (!emailRegex.test(normalizedEmail)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only @vetorimobi.com.br email addresses can register as super admin',
        })
      }

      // Check if user already exists (use normalized email)
      const [existingUser] = await withRetry(() =>
        db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1)
      )

      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists',
        })
      }

      // Create or get "Vetor Imobi" organization for superadmins
      let organizationId: string
      const [existingOrg] = await withRetry(() =>
        db
          .select()
          .from(organizations)
          .where(eq(organizations.name, 'Vetor Imobi'))
          .limit(1)
      )

      if (existingOrg) {
        organizationId = existingOrg.id
      } else {
        const [newOrg] = await withRetry(() =>
          db
            .insert(organizations)
            .values({
              name: 'Vetor Imobi',
            })
            .returning()
        )
        organizationId = newOrg.id
      }

      // Hash password
      const passwordHash = await hashPassword(password)

      // Create superadmin user
      const userId = randomUUID()
      const [newUser] = await withRetry(() =>
        db
          .insert(users)
          .values({
            id: userId,
            email: normalizedEmail,
            password_hash: passwordHash,
            organization_id: organizationId,
            role: 'superadmin',
            auth_provider: 'local',
          })
          .returning()
      )

      // Generate token
      const token = await generateToken(fastify, newUser)

      return reply.status(201).send({
        message: 'Super admin registered successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          organization_id: newUser.organization_id,
          role: newUser.role,
        },
        token,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to register super admin',
      })
    }
  })
}
