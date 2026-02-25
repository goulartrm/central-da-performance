import type { FastifyInstance, FastifyRequest } from 'fastify'
import { db, withRetry } from '../db/index.js'
import { users, organizations } from '../db/schema.js'
import { eq, desc, like, or, and, sql, count } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { authMiddleware, isSuperAdmin, type AuthUser } from '../middleware/auth.js'
import { verifyPassword, hashPassword } from '../services/auth.js'

interface Org {
  id: string
  name: string
  created_at: string
  user_count: number
}

interface User {
  id: string
  email: string
  role: string
  organization_id: string
  organization_name: string | null
  created_at: string
}

interface Stats {
  organizations: number
  users: number
  superadmins: number
}

// CRM Config types with explicit properties (no [key: string]: any)
interface VetorCrmConfig {
  vetor_api_key?: string
  vetor_company_id?: string
}

interface MadaCrmConfig {
  mada_supabase_url?: string
  mada_supabase_key?: string
}

type CrmConfig = VetorCrmConfig | MadaCrmConfig

// Properly validated email domain check with normalization
function isVetorimobiEmail(email: string): boolean {
  if (!email) return false
  // Trim and normalize
  const normalized = email.trim().toLowerCase()
  // Check for null bytes and other injection attempts
  if (normalized.includes('\0') || normalized.includes('\n') || normalized.includes('\r')) {
    return false
  }
  // Validate with regex and check exact domain match
  const emailRegex = /^[^\s@]+@vetorimobi\.com\.br$/
  return emailRegex.test(normalized)
}

// Helper to verify user is superadmin
function requireSuperadmin(user: AuthUser): void {
  if (!isSuperAdmin(user)) {
    throw new Error('Forbidden: Superadmin access required')
  }
}

export default async function superadminRoutes(fastify: FastifyInstance) {
  // ALL superadmin routes require authentication and superadmin role

  // GET /api/superadmin/stats - Get overview stats
  fastify.get('/stats', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }

      // Verify superadmin role
      requireSuperadmin(user)

      const [orgCount] = await withRetry(() =>
        db.select({ count: count() }).from(organizations)
      )

      const [userCount] = await withRetry(() =>
        db.select({ count: count() }).from(users)
      )

      const [superadminCount] = await withRetry(() =>
        db.select({ count: count() }).from(users).where(
          and(
            eq(users.role, 'admin'),
            like(users.email, '%@vetorimobi.com.br')
          )
        )
      )

      return reply.send({
        organizations: Number(orgCount?.count || 0),
        users: Number(userCount?.count || 0),
        superadmins: Number(superadminCount?.count || 0),
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch stats',
      })
    }
  })

  // GET /api/superadmin/organizations - List all organizations
  fastify.get('/organizations', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }
      requireSuperadmin(user)

      const organizationsList = await withRetry(() =>
        db
          .select({
            id: organizations.id,
            name: organizations.name,
            company_id: organizations.company_id,
            crm_type: organizations.crm_type,
            created_at: organizations.created_at,
            user_count: sql<number>`(SELECT COUNT(*) FROM users WHERE users.organization_id = organizations.id)`,
          })
          .from(organizations)
          .orderBy(desc(organizations.created_at))
      )

      return reply.send({ organizations: organizationsList })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch organizations',
      })
    }
  })

  // POST /api/superadmin/organizations - Create new organization
  fastify.post('/organizations', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }
      requireSuperadmin(user)

      const body = request.body as {
        name: string
      }

      if (!body.name || body.name.trim() === '') {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Organization name is required',
        })
      }

      const [newOrg] = await withRetry(() =>
        db
          .insert(organizations)
          .values({
            name: body.name.trim(),
          })
          .returning()
      )

      return reply.status(201).send({
        message: 'Organization created successfully',
        organization: newOrg,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to create organization',
      })
    }
  })

  // PUT /api/superadmin/organizations/:id - Update organization name
  fastify.put('/organizations/:id', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }
      requireSuperadmin(user)

      const { id } = request.params as { id: string }
      const body = request.body as {
        name: string
      }

      if (!body.name || body.name.trim() === '') {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Organization name is required',
        })
      }

      const [updatedOrg] = await withRetry(() =>
        db
          .update(organizations)
          .set({
            name: body.name.trim(),
            updated_at: new Date(),
          })
          .where(eq(organizations.id, id))
          .returning()
      )

      if (!updatedOrg) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Organization not found',
        })
      }

      return reply.send({
        message: 'Organization updated successfully',
        organization: updatedOrg,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to update organization',
      })
    }
  })

  // GET /api/superadmin/organizations/:id - Get organization details
  fastify.get('/organizations/:id', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }
      requireSuperadmin(user)

      const { id } = request.params as { id: string }

      const [org] = await withRetry(() =>
        db.select().from(organizations).where(eq(organizations.id, id)).limit(1)
      )

      if (!org) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Organization not found',
        })
      }

      // Get users in this organization
      const orgUsers = await withRetry(() =>
        db
          .select({
            id: users.id,
            email: users.email,
            role: users.role,
            created_at: users.created_at,
          })
          .from(users)
          .where(eq(users.organization_id, id))
          .orderBy(desc(users.created_at))
      )

      // Return organization WITHOUT sensitive CRM config keys
      const safeOrg = {
        id: org.id,
        name: org.name,
        company_id: org.company_id,
        crm_type: org.crm_type,
        created_at: org.created_at,
        updated_at: org.updated_at,
        // Don't expose crm_config with API keys
      }

      return reply.send({
        organization: safeOrg,
        users: orgUsers,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch organization',
      })
    }
  })

  // PUT /api/superadmin/organizations/:id/crm-config - Update organization CRM configuration
  fastify.put('/organizations/:id/crm-config', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }
      requireSuperadmin(user)

      const { id } = request.params as { id: string }
      const body = request.body as {
        crm_type: 'vetor' | 'mada' | 'none'
        crm_config?: CrmConfig
      }

      // Validate crm_type
      const validCrmTypes = ['vetor', 'mada', 'none']
      if (!body.crm_type || !validCrmTypes.includes(body.crm_type)) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Valid crm_type is required (vetor, mada, or none)',
        })
      }

      // Check if organization exists
      const [existingOrg] = await withRetry(() =>
        db.select().from(organizations).where(eq(organizations.id, id)).limit(1)
      )

      if (!existingOrg) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Organization not found',
        })
      }

      // Validate CRM config based on crm_type with URL validation
      if (body.crm_type === 'vetor' && body.crm_config) {
        const vetorConfig = body.crm_config as VetorCrmConfig
        if (!vetorConfig.vetor_api_key) {
          return reply.status(400).send({
            error: 'Bad request',
            message: 'vetor_api_key is required for Vetor CRM',
          })
        }
        if (!vetorConfig.vetor_company_id) {
          return reply.status(400).send({
            error: 'Bad request',
            message: 'vetor_company_id is required for Vetor CRM',
          })
        }
      }

      if (body.crm_type === 'mada' && body.crm_config) {
        const madaConfig = body.crm_config as MadaCrmConfig
        if (!madaConfig.mada_supabase_url || !madaConfig.mada_supabase_key) {
          return reply.status(400).send({
            error: 'Bad request',
            message: 'mada_supabase_url and mada_supabase_key are required for Mada CRM',
          })
        }

        // Validate Supabase URL to prevent SSRF
        try {
          const url = new URL(madaConfig.mada_supabase_url)
          // Only allow https://*.supabase.co domains
          if (!url.hostname.endsWith('.supabase.co')) {
            return reply.status(400).send({
              error: 'Bad request',
              message: 'Invalid Supabase URL. Must be a *.supabase.co domain',
            })
          }
          if (url.protocol !== 'https:') {
            return reply.status(400).send({
              error: 'Bad request',
              message: 'Supabase URL must use HTTPS',
            })
          }
        } catch {
          return reply.status(400).send({
            error: 'Bad request',
            message: 'Invalid Supabase URL format',
          })
        }
      }

      // Update organization CRM configuration
      const [updatedOrg] = await withRetry(() =>
        db
          .update(organizations)
          .set({
            crm_type: body.crm_type,
            crm_config: body.crm_config || null,
            company_id: (body.crm_config as VetorCrmConfig)?.vetor_company_id || null,
            updated_at: new Date(),
          })
          .where(eq(organizations.id, id))
          .returning()
      )

      // Return updated org WITHOUT sensitive API keys
      const safeOrg = {
        id: updatedOrg.id,
        name: updatedOrg.name,
        crm_type: updatedOrg.crm_type,
        company_id: updatedOrg.company_id,
        created_at: updatedOrg.created_at,
        updated_at: updatedOrg.updated_at,
      }

      return reply.send({
        message: 'CRM configuration updated successfully',
        organization: safeOrg,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to update CRM configuration',
      })
    }
  })

  // GET /api/superadmin/users - List all users
  fastify.get('/users', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }
      requireSuperadmin(user)

      const query = request.query as { role?: string; search?: string }

      const conditions = []

      if (query.role) {
        conditions.push(eq(users.role, query.role))
      }

      if (query.search) {
        // Sanitize search term to prevent SQL injection via LIKE
        const sanitizedSearch = query.search.replace(/[%_\\]/g, '\\$&')
        const searchTerm = `%${sanitizedSearch}%`
        conditions.push(like(users.email, searchTerm))
      }

      const usersList = await withRetry(() =>
        db
          .select({
            id: users.id,
            email: users.email,
            role: users.role,
            organization_id: users.organization_id,
            organization_name: organizations.name,
            created_at: users.created_at,
          })
          .from(users)
          .leftJoin(organizations, eq(users.organization_id, organizations.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(users.created_at))
      )

      return reply.send({ users: usersList })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch users',
      })
    }
  })

  // POST /api/superadmin/invite - Invite user (create admin for organization)
  fastify.post('/invite', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }
      requireSuperadmin(user)

      const body = request.body as {
        email: string
        password: string
        organization_id: string
        role?: string
      }

      if (!body.email || !body.password || !body.organization_id) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Email, password, and organization_id are required',
        })
      }

      // Enhanced password validation
      if (body.password.length < 12) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Password must be at least 12 characters long',
        })
      }

      // Check for password complexity
      const hasUpperCase = /[A-Z]/.test(body.password)
      const hasLowerCase = /[a-z]/.test(body.password)
      const hasNumber = /[0-9]/.test(body.password)
      const hasSpecial = /[^A-Za-z0-9]/.test(body.password)

      if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Password must contain uppercase, lowercase, and numbers',
        })
      }

      // Check if organization exists
      const [org] = await withRetry(() =>
        db.select().from(organizations).where(eq(organizations.id, body.organization_id)).limit(1)
      )

      if (!org) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Organization not found',
        })
      }

      // Check if user already exists
      const [existingUser] = await withRetry(() =>
        db.select().from(users).where(eq(users.email, body.email.toLowerCase())).limit(1)
      )

      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists',
        })
      }

      // Hash password
      const passwordHash = await hashPassword(body.password)

      // Create user
      const userId = randomUUID()
      const userRole = body.role || 'admin'

      const [newUser] = await withRetry(() =>
        db
          .insert(users)
          .values({
            id: userId,
            email: body.email.toLowerCase(),
            password_hash: passwordHash,
            organization_id: body.organization_id,
            role: userRole,
            auth_provider: 'local',
          })
          .returning()
      )

      return reply.status(201).send({
        message: 'User invited successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          organization_id: newUser.organization_id,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to invite user',
      })
    }
  })

  // PUT /api/superadmin/promote-superadmin - Promote user to superadmin
  fastify.put('/promote-superadmin', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }

      // Only existing superadmins can promote others
      requireSuperadmin(user)

      const body = request.body as {
        email: string
      }

      if (!body.email) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Email is required',
        })
      }

      // Normalize email
      const normalizedEmail = body.email.trim().toLowerCase()

      // Check for null bytes and injection attempts
      if (/\0|\n|\r/.test(normalizedEmail)) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Invalid email format',
        })
      }

      // Check if email is from vetorimobi.com.br domain
      if (!isVetorimobiEmail(normalizedEmail)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only @vetorimobi.com.br email addresses can be promoted to superadmin',
        })
      }

      const [updatedUser] = await withRetry(() =>
        db
          .update(users)
          .set({ role: 'superadmin' })
          .where(eq(users.email, normalizedEmail))
          .returning()
      )

      if (!updatedUser) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'User not found',
        })
      }

      return reply.send({
        message: 'User promoted to superadmin successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to promote user',
      })
    }
  })

  // PUT /api/superadmin/users/:id/role - Update user role
  fastify.put('/users/:id/role', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }
      requireSuperadmin(user)

      const { id } = request.params as { id: string }
      const body = request.body as {
        role: string
      }

      const validRoles = ['gestor', 'admin', 'superadmin']
      if (!body.role || !validRoles.includes(body.role)) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Valid role is required (gestor, admin, or superadmin)',
        })
      }

      // Prevent self-demotion (superadmin can't remove their own role)
      if (id === user.id && body.role !== 'superadmin') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You cannot change your own role',
        })
      }

      const [updatedUser] = await withRetry(() =>
        db
          .update(users)
          .set({ role: body.role })
          .where(eq(users.id, id))
          .returning()
      )

      if (!updatedUser) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'User not found',
        })
      }

      return reply.send({
        message: 'User role updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to update user role',
      })
    }
  })

  // DELETE /api/superadmin/users/:id - Delete user
  fastify.delete('/users/:id', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }
      requireSuperadmin(user)

      const { id } = request.params as { id: string }

      // Prevent self-deletion
      if (id === user.id) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You cannot delete your own account',
        })
      }

      const [deletedUser] = await withRetry(() =>
        db.delete(users).where(eq(users.id, id)).returning()
      )

      if (!deletedUser) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'User not found',
        })
      }

      return reply.send({
        message: 'User deleted successfully',
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to delete user',
      })
    }
  })

  // DELETE /api/superadmin/organizations/:id - Delete organization and all its users
  fastify.delete('/organizations/:id', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        })
      }
      requireSuperadmin(user)

      const { id } = request.params as { id: string }

      // Prevent deletion of own organization
      if (id === user.organization_id) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You cannot delete your own organization',
        })
      }

      // First delete all users in organization
      await withRetry(() =>
        db.delete(users).where(eq(users.organization_id, id))
      )

      // Then delete organization
      const [deletedOrg] = await withRetry(() =>
        db.delete(organizations).where(eq(organizations.id, id)).returning()
      )

      if (!deletedOrg) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Organization not found',
        })
      }

      return reply.send({
        message: 'Organization deleted successfully',
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden: Superadmin access required') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Superadmin access required',
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to delete organization',
      })
    }
  })
}
