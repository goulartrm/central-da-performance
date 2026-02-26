import type { FastifyInstance } from 'fastify'
import { db, withRetry } from '../db/index.js'
import { deals, brokers, activityLogs } from '../db/schema.js'
import { eq, and, like, or, desc, sql, count, not } from 'drizzle-orm'
import type { DealStatus, Sentiment } from '../types/index.js'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'

interface DealsQuery {
  page?: string
  limit?: string
  status?: DealStatus
  sentiment?: Sentiment
  broker_id?: string
  search?: string
}

export default async function dealsRoutes(fastify: FastifyInstance) {
  // GET /api/deals - List deals with filtering and pagination
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

      const query = request.query as DealsQuery

      // Parse pagination params
      const page = Math.max(1, parseInt(query.page || '1', 10))
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)))
      const offset = (page - 1) * limit

      // Build conditions - ALWAYS filter by user's organization_id
      const conditions = [eq(deals.organization_id, user.organization_id)]

      if (query.status) {
        conditions.push(eq(deals.status, query.status))
      }

      if (query.sentiment) {
        conditions.push(eq(deals.sentiment, query.sentiment))
      }

      if (query.broker_id) {
        conditions.push(eq(deals.broker_id, query.broker_id))
      }

      if (query.search) {
        const searchTerm = `%${query.search}%`
        conditions.push(
          or(
            like(deals.client_name, searchTerm),
            like(deals.property_title, searchTerm),
            like(deals.client_phone, searchTerm)
          )
        )
      }

      // Get total count with retry
      const [countResult] = await withRetry(() =>
        db
          .select({ count: count() })
          .from(deals)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
      )

      const total = Number(countResult?.count || 0)

      // Get deals with broker info with retry
      const dealsList = await withRetry(() =>
        db
          .select({
            id: deals.id,
            organization_id: deals.organization_id,
            broker_id: deals.broker_id,
            broker_first_name: brokers.first_name,
            broker_last_name: brokers.last_name,
            broker_name: brokers.name,
            client_name: deals.client_name,
            client_phone: deals.client_phone,
            client_email: deals.client_email,
            property_title: deals.property_title,
            property_id: deals.property_id,
            status: deals.status,
            sentiment: deals.sentiment,
            smart_summary: deals.smart_summary,
            last_activity: deals.last_activity,
            potential_value: deals.potential_value,
            // New Vetor fields
            stage: deals.stage,
            stage_entered_at: deals.stage_entered_at,
            potential_commission: deals.potential_commission,
            exclusividade: deals.exclusividade,
            origem: deals.origem,
            created_at: deals.created_at,
            updated_at: deals.updated_at,
          })
          .from(deals)
          .leftJoin(brokers, eq(deals.broker_id, brokers.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(deals.updated_at))
          .limit(limit)
          .offset(offset)
      )

      // Add computed broker_name and format response
      const formattedDeals = dealsList.map(deal => ({
        ...deal,
        broker_name: deal.broker_first_name && deal.broker_last_name
          ? `${deal.broker_first_name} ${deal.broker_last_name}`.trim()
          : deal.broker_name || null,
      }))

      return reply.send({
        deals: formattedDeals,
        total,
        page,
        limit,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch deals',
      })
    }
  })

  // GET /api/deals/stats - Get deals statistics
  fastify.get('/stats', {
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

      const orgCondition = eq(deals.organization_id, user.organization_id)

      // Total count - all deals for the organization
      const [totalCount] = await withRetry(() =>
        db
          .select({ count: count() })
          .from(deals)
          .where(orgCondition)
      )
      const total = Number(totalCount?.count || 0)

      // Ativos count - all deals except "Lost" status
      const [ativosCount] = await withRetry(() =>
        db
          .select({ count: count() })
          .from(deals)
          .where(and(
            orgCondition,
            not(eq(deals.status, 'Lost'))
          ))
      )
      const ativos = Number(ativosCount?.count || 0)

      // Em Visita count - deals with "Negotiation" status (visita stages map to Negotiation)
      const [emVisitaCount] = await withRetry(() =>
        db
          .select({ count: count() })
          .from(deals)
          .where(and(
            orgCondition,
            eq(deals.status, 'Negotiation')
          ))
      )
      const emVisita = Number(emVisitaCount?.count || 0)

      // Pipeline value - sum of potential_value for active deals (not Lost)
      const [pipelineResult] = await withRetry(() =>
        db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(${deals.potential_value} AS DECIMAL(12,2))), 0)`
          })
          .from(deals)
          .where(and(
            orgCondition,
            not(eq(deals.status, 'Lost'))
          ))
      )
      const pipelineValue = Number(pipelineResult?.total || 0)

      return reply.send({
        total,
        ativos,
        emVisita,
        pipelineValue,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch deals statistics',
      })
    }
  })

  // GET /api/deals/:id - Get deal details with activity logs
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

      // Get deal with broker info - must belong to user's organization
      const [deal] = await db
        .select({
          id: deals.id,
          organization_id: deals.organization_id,
          broker_id: deals.broker_id,
          broker_first_name: brokers.first_name,
          broker_last_name: brokers.last_name,
          broker_name: brokers.name,
          broker_phone: brokers.phone,
          client_name: deals.client_name,
          client_phone: deals.client_phone,
          client_email: deals.client_email,
          property_title: deals.property_title,
          property_id: deals.property_id,
          status: deals.status,
          sentiment: deals.sentiment,
          smart_summary: deals.smart_summary,
          last_activity: deals.last_activity,
          potential_value: deals.potential_value,
          // New Vetor fields
          stage: deals.stage,
          stage_entered_at: deals.stage_entered_at,
          potential_commission: deals.potential_commission,
          exclusividade: deals.exclusividade,
          origem: deals.origem,
          created_at: deals.created_at,
          updated_at: deals.updated_at,
        })
        .from(deals)
        .leftJoin(brokers, eq(deals.broker_id, brokers.id))
        .where(and(
          eq(deals.id, id),
          eq(deals.organization_id, user.organization_id)
        ))

      if (!deal) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Deal not found',
        })
      }

      // Get activity logs
      const activity = await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.deal_id, id))
        .orderBy(desc(activityLogs.created_at))

      // Add computed broker_name
      const dealWithBrokerName = {
        ...deal,
        broker_name: deal.broker_first_name && deal.broker_last_name
          ? `${deal.broker_first_name} ${deal.broker_last_name}`.trim()
          : deal.broker_name || null,
        activity_logs: activity,
      }

      return reply.send(dealWithBrokerName)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch deal details',
      })
    }
  })

  // PUT /api/deals/:id - Update deal
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
        status: string
        sentiment: string
        smart_summary: string
        notes: string
        potential_value: string
        broker_id: string
      }>

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {
        updated_at: new Date(),
      }

      if (body.status !== undefined) updateData.status = body.status
      if (body.sentiment !== undefined) updateData.sentiment = body.sentiment
      if (body.smart_summary !== undefined) updateData.smart_summary = body.smart_summary
      if (body.potential_value !== undefined) updateData.potential_value = body.potential_value
      if (body.broker_id !== undefined) updateData.broker_id = body.broker_id

      // Update deal - must belong to user's organization
      const [updatedDeal] = await db
        .update(deals)
        .set(updateData)
        .where(and(
          eq(deals.id, id),
          eq(deals.organization_id, user.organization_id)
        ))
        .returning()

      if (!updatedDeal) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Deal not found',
        })
      }

      // If notes were provided, create an activity log
      if (body.notes) {
        await db
          .insert(activityLogs)
          .values({
            deal_id: id,
            type: 'Note',
            description: body.notes,
          })
      }

      return reply.send({
        message: 'Deal updated successfully',
        deal: updatedDeal,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to update deal',
      })
    }
  })
}
