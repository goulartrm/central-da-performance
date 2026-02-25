import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { deals, activityLogs } from '../db/schema.js'
import { eq, and, gte, sql, count, desc } from 'drizzle-orm'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // GET /api/dashboard/stats - Get dashboard KPIs
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

      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Risk deals (Negative or Urgent sentiment) - filtered by organization
      const [riskDealsResult] = await db
        .select({ count: count() })
        .from(deals)
        .where(and(
          eq(deals.organization_id, user.organization_id),
          sql`deals.sentiment IN ('Negative', 'Urgent')`
        ))

      // Active conversations (deals with activity in last 24h) - filtered by organization
      const [activeConversationsResult] = await db
        .select({ count: count() })
        .from(deals)
        .where(and(
          eq(deals.organization_id, user.organization_id),
          gte(deals.last_activity, twentyFourHoursAgo)
        ))

      // New summaries (activity logs of type ConversationSummary in last 24h)
      // Note: activity_logs don't have organization_id directly, so we need to join with deals
      const [newSummariesResult] = await db
        .select({ count: count() })
        .from(activityLogs)
        .innerJoin(deals, eq(activityLogs.deal_id, deals.id))
        .where(
          and(
            eq(deals.organization_id, user.organization_id),
            eq(activityLogs.type, 'ConversationSummary'),
            gte(activityLogs.created_at, twentyFourHoursAgo)
          )
        )

      // Average response time - filtered by organization
      const [avgTimeResult] = await db
        .select({ avg: sql`AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_activity)) / 60)` })
        .from(deals)
        .where(and(
          eq(deals.organization_id, user.organization_id),
          sql`last_activity IS NOT NULL`
        ))

      const avgResponseTime = avgTimeResult?.avg ? Math.round(Number(avgTimeResult.avg)) : null

      return reply.send({
        riskDeals: Number(riskDealsResult?.count || 0),
        activeConversations: Number(activeConversationsResult?.count || 0),
        avgResponseTime,
        newSummaries: Number(newSummariesResult?.count || 0),
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch dashboard stats',
      })
    }
  })
}
