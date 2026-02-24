import type { FastifyInstance, FastifyRequest } from 'fastify'
import { db, withRetry } from '../db/index.js'
import { users, organizations } from '../db/schema.js'
import { eq, desc, like, or, and, sql, count } from 'drizzle-orm'
import { randomUUID } from 'crypto'

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

// Check if email is from vetorimobi.com.br domain
function isVetorimobiEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@vetorimobi.com.br')
}

export default async function superadminRoutes(fastify: FastifyInstance) {
  // GET /api/superadmin/stats - Get overview stats
  fastify.get('/stats', async (request, reply) => {
    try {
      const [orgCount] = await withRetry(() =>
        db.select({ count: count() }).from(organizations)
      )

      const [userCount] = await withRetry(() =>
        db.select({ count: count() }).from(users)
      )

      const [superadminCount] = await withRetry(() =>
        db.select({ count: count() }).from(users).where(eq(users.role, 'superadmin'))
      )

      return reply.send({
        organizations: Number(orgCount?.count || 0),
        users: Number(userCount?.count || 0),
        superadmins: Number(superadminCount?.count || 0),
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch stats',
      })
    }
  })

  // GET /api/superadmin/organizations - List all organizations
  fastify.get('/organizations', async (request, reply) => {
    try {
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
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch organizations',
      })
    }
  })

  // POST /api/superadmin/organizations - Create new organization
  fastify.post('/organizations', async (request, reply) => {
    try {
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
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to create organization',
      })
    }
  })

  // PUT /api/superadmin/organizations/:id - Update organization name
  fastify.put('/organizations/:id', async (request, reply) => {
    try {
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
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to update organization',
      })
    }
  })

  // GET /api/superadmin/organizations/:id - Get organization details
  fastify.get('/organizations/:id', async (request, reply) => {
    try {
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

      // Return organization with CRM config (excluding sensitive data from legacy fields)
      const { vetor_api_key, mada_supabase_key, ...orgSafe } = org

      return reply.send({
        organization: {
          ...orgSafe,
          company_id: org.company_id || null,
          crm_config: org.crm_config || null,
        },
        users: orgUsers,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch organization',
      })
    }
  })

  // PUT /api/superadmin/organizations/:id/crm-config - Update organization CRM configuration
  fastify.put('/organizations/:id/crm-config', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        crm_type: 'vetor' | 'mada' | 'none'
        crm_config?: {
          vetor_api_key?: string
          vetor_company_id?: string
          mada_supabase_url?: string
          mada_supabase_key?: string
          [key: string]: any
        }
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

      // Validate CRM config based on crm_type
      if (body.crm_type === 'vetor' && body.crm_config) {
        if (!body.crm_config.vetor_api_key) {
          return reply.status(400).send({
            error: 'Bad request',
            message: 'vetor_api_key is required for Vetor CRM',
          })
        }
        if (!body.crm_config.vetor_company_id) {
          return reply.status(400).send({
            error: 'Bad request',
            message: 'vetor_company_id is required for Vetor CRM',
          })
        }
      }

      if (body.crm_type === 'mada' && body.crm_config) {
        if (!body.crm_config.mada_supabase_url || !body.crm_config.mada_supabase_key) {
          return reply.status(400).send({
            error: 'Bad request',
            message: 'mada_supabase_url and mada_supabase_key are required for Mada CRM',
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
            company_id: body.crm_config?.vetor_company_id || null,
            updated_at: new Date(),
          })
          .where(eq(organizations.id, id))
          .returning()
      )

      // Return updated org without sensitive legacy fields
      const { vetor_api_key, mada_supabase_key, ...orgSafe } = updatedOrg

      return reply.send({
        message: 'CRM configuration updated successfully',
        organization: {
          ...orgSafe,
          crm_config: updatedOrg.crm_config || null,
        },
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to update CRM configuration',
      })
    }
  })

  // GET /api/superadmin/users - List all users
  fastify.get('/users', async (request, reply) => {
    try {
      const query = request.query as { role?: string; search?: string }

      const conditions = []

      if (query.role) {
        conditions.push(eq(users.role, query.role))
      }

      if (query.search) {
        const searchTerm = `%${query.search}%`
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
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch users',
      })
    }
  })

  // POST /api/superadmin/invite - Invite user (create admin for organization)
  fastify.post('/invite', async (request, reply) => {
    try {
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

      if (body.password.length < 8) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Password must be at least 8 characters long',
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
        db.select().from(users).where(eq(users.email, body.email)).limit(1)
      )

      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists',
        })
      }

      // Create user
      const userId = randomUUID()
      const userRole = body.role || 'admin'

      const [newUser] = await withRetry(() =>
        db
          .insert(users)
          .values({
            id: userId,
            email: body.email,
            password_hash: 'NEON_AUTH_USER', // Will be set by Neon Auth
            organization_id: body.organization_id,
            role: userRole,
            auth_provider: 'neon',
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
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to invite user',
      })
    }
  })

  // PUT /api/superadmin/promote-superadmin - Promote user to superadmin
  fastify.put('/promote-superadmin', async (request, reply) => {
    try {
      const body = request.body as {
        email: string
      }

      if (!body.email) {
        return reply.status(400).send({
          error: 'Bad request',
          message: 'Email is required',
        })
      }

      // Check if email is from vetorimobi.com.br domain
      if (!isVetorimobiEmail(body.email)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only @vetorimobi.com.br email addresses can be promoted to superadmin',
        })
      }

      const [updatedUser] = await withRetry(() =>
        db
          .update(users)
          .set({ role: 'superadmin' })
          .where(eq(users.email, body.email))
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
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to promote user',
      })
    }
  })

  // PUT /api/superadmin/users/:id/role - Update user role
  fastify.put('/users/:id/role', async (request, reply) => {
    try {
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
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to update user role',
      })
    }
  })

  // DELETE /api/superadmin/users/:id - Delete user
  fastify.delete('/users/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

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
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to delete user',
      })
    }
  })

  // DELETE /api/superadmin/organizations/:id - Delete organization and all its users
  fastify.delete('/organizations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

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
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to delete organization',
      })
    }
  })
}
