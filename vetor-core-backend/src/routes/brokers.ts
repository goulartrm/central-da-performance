import type { FastifyInstance } from 'fastify'
import { db, withRetry } from '../db/index.js'
import { brokers } from '../db/schema.js'
import { eq, and, like, or, desc } from 'drizzle-orm'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'

interface BrokersQuery {
  active?: string
  search?: string
}

export default async function brokersRoutes(fastify: FastifyInstance) {
  // POST /api/brokers - Create a new broker
  fastify.post('/', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      const body = request.body as {
        name: string
        email?: string
        phone?: string
      }

      // Validate required fields
      if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
        return reply.status(400).send({
          error: 'Validation error',
          message: 'Name is required',
        })
      }

      // Create broker with retry
      const [newBroker] = await withRetry(() =>
        db
          .insert(brokers)
          .values({
            organization_id: user.organization_id,
            name: body.name.trim(),
            email: body.email?.trim() || null,
            phone: body.phone?.trim() || null,
            is_active: true,
          })
          .returning()
      )

      return reply.status(201).send({
        message: 'Broker created successfully',
        broker: newBroker,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to create broker',
      })
    }
  })

  // GET /api/brokers - List brokers with filtering
  fastify.get('/', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      const query = request.query as BrokersQuery

      // Build conditions - ALWAYS filter by user's organization_id
      const conditions = [eq(brokers.organization_id, user.organization_id)]

      if (query.active !== undefined) {
        const isActive = query.active === 'true'
        conditions.push(eq(brokers.is_active, isActive))
      }

      if (query.search) {
        const searchTerm = `%${query.search}%`
        conditions.push(
          or(
            like(brokers.name, searchTerm),
            like(brokers.email, searchTerm),
            like(brokers.phone, searchTerm)
          )!
        )
      }

      // Get brokers with retry
      const brokersList = await withRetry(() =>
        db
          .select()
          .from(brokers)
          .where(and(...conditions))
          .orderBy(desc(brokers.created_at))
      )

      return reply.send({
        brokers: brokersList,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch brokers',
      })
    }
  })

  // GET /api/brokers/:id - Get broker details
  fastify.get('/:id', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      const { id } = request.params as { id: string }

      const [broker] = await withRetry(() =>
        db
          .select()
          .from(brokers)
          .where(and(
            eq(brokers.id, id),
            eq(brokers.organization_id, user.organization_id)
          ))
      )

      if (!broker) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Broker not found',
        })
      }

      return reply.send(broker)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch broker details',
      })
    }
  })

  // PUT /api/brokers/:id - Update broker
  fastify.put('/:id', {
    onRequest: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as { user?: AuthUser }).user
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      const { id } = request.params as { id: string }
      const body = request.body as Partial<{
        name: string
        email: string
        phone: string
        is_active: boolean
      }>

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {}

      if (body.name !== undefined) updateData.name = body.name
      if (body.email !== undefined) updateData.email = body.email
      if (body.phone !== undefined) updateData.phone = body.phone
      if (body.is_active !== undefined) updateData.is_active = body.is_active

      // Update broker with retry - must belong to user's organization
      const [updatedBroker] = await withRetry(() =>
        db
          .update(brokers)
          .set(updateData)
          .where(and(
            eq(brokers.id, id),
            eq(brokers.organization_id, user.organization_id)
          ))
          .returning()
      )

      if (!updatedBroker) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Broker not found',
        })
      }

      return reply.send({
        message: 'Broker updated successfully',
        broker: updatedBroker,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to update broker',
      })
    }
  })
}
