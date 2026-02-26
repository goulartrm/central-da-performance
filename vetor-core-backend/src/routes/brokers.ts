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
        first_name?: string
        last_name?: string
        name?: string // Legacy support - will be split
        email?: string
        phone?: string
      }

      // Handle legacy 'name' field by splitting it
      let firstName = body.first_name?.trim() || ''
      let lastName = body.last_name?.trim() || ''

      if (body.name && body.name.trim()) {
        const nameParts = body.name.trim().split(' ')
        firstName = nameParts[0] || ''
        lastName = nameParts.slice(1).join(' ') || ''
      }

      // Validate required fields
      if (!firstName) {
        return reply.status(400).send({
          error: 'Validation error',
          message: 'First name is required',
        })
      }

      // Create broker with retry
      const [newBroker] = await withRetry(() =>
        db
          .insert(brokers)
          .values({
            organization_id: user.organization_id,
            first_name: firstName,
            last_name: lastName,
            email: body.email?.trim() || null,
            phone: body.phone?.trim() || null,
            is_active: true,
          })
          .returning()
      )

      // Add computed 'name' field for API response
      const brokerWithFullName = {
        ...newBroker,
        name: `${newBroker.first_name} ${newBroker.last_name}`.trim(),
      }

      return reply.status(201).send({
        message: 'Broker created successfully',
        broker: brokerWithFullName,
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
            like(brokers.first_name, searchTerm),
            like(brokers.last_name, searchTerm),
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

      // Add computed 'name' field for each broker
      const brokersWithFullName = brokersList.map(broker => ({
        ...broker,
        name: `${broker.first_name} ${broker.last_name}`.trim(),
      }))

      return reply.send({
        brokers: brokersWithFullName,
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

      // Add computed 'name' field for API response
      const brokerWithFullName = {
        ...broker,
        name: `${broker.first_name} ${broker.last_name}`.trim(),
      }

      return reply.send(brokerWithFullName)
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
        first_name: string
        last_name: string
        name?: string // Legacy support
        email: string
        phone: string
        is_active: boolean
      }>

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {}

      if (body.first_name !== undefined) updateData.first_name = body.first_name
      if (body.last_name !== undefined) updateData.last_name = body.last_name
      if (body.email !== undefined) updateData.email = body.email
      if (body.phone !== undefined) updateData.phone = body.phone
      if (body.is_active !== undefined) updateData.is_active = body.is_active

      // Handle legacy 'name' field
      if (body.name !== undefined && body.name.trim()) {
        const nameParts = body.name.trim().split(' ')
        updateData.first_name = nameParts[0] || ''
        updateData.last_name = nameParts.slice(1).join(' ') || ''
      }

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

      // Add computed 'name' field for API response
      const brokerWithFullName = {
        ...updatedBroker,
        name: `${updatedBroker.first_name} ${updatedBroker.last_name}`.trim(),
      }

      return reply.send({
        message: 'Broker updated successfully',
        broker: brokerWithFullName,
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
