import type { FastifyInstance } from 'fastify'
import { syncLogs, organizations, brokers, deals, activityLogs } from '../db/schema.js'
import { db, withRetry } from '../db/index.js'
import { desc, eq, and } from 'drizzle-orm'
import type { SyncSource } from '../types/index.js'
import type { VetorImobiAdapter } from '../services/vetor-api.js'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'

interface SyncBody {
  source: SyncSource
  minutes?: number
}

export default async function syncRoutes(fastify: FastifyInstance) {
  // POST /api/sync - Manual trigger for sync (only for user's organization)
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

      const body = request.body as SyncBody
      const { source, minutes = 525600 } = body // Default to 365 days for manual sync

      // Validate source
      if (!['mada', 'vetor_imobi', 'all'].includes(source)) {
        return reply.status(400).send({
          error: 'Invalid source',
          message: 'Source must be "mada", "vetor_imobi", or "all"',
        })
      }

      // Get the user's organization
      const [org] = await withRetry(() =>
        db
          .select()
          .from(organizations)
          .where(eq(organizations.id, user.organization_id))
          .limit(1)
      )

      if (!org) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Organization not found',
        })
      }

      let totalRecordsProcessed = 0
      const syncLogIds: string[] = []

      // Sync Vetor Imobi if configured
      if ((source === 'vetor_imobi' || source === 'all') && org.crm_type === 'vetor') {
        if (!org.crm_config?.vetor_api_key) {
          return reply.status(400).send({
            error: 'Bad request',
            message: 'Vetor Imobi API key not configured for this organization',
          })
        }

        // Create sync log entry for this organization
        const [syncLog] = await db
          .insert(syncLogs)
          .values({
            organization_id: org.id,
            source: 'vetor_imobi',
            status: 'running',
            records_processed: 0,
            started_at: new Date(),
          })
          .returning()

        syncLogIds.push(syncLog.id)

        let recordsProcessed = 0

        try {
          // Import adapter class
          const { VetorImobiAdapter } = await import('../services/vetor-api.js')

          // Create adapter with org-specific credentials
          const vetorAdapter = new VetorImobiAdapter(
            org.crm_config.vetor_api_key,
            undefined, // Use default base URL
            org.crm_config.vetor_company_id || org.company_id || undefined
          )

          // Fetch data from API with company_id filter (filtered at API level)
          const [users, clients, dealsData] = await Promise.all([
            vetorAdapter.fetchUsers(),
            vetorAdapter.fetchClients(),
            vetorAdapter.fetchDeals(),
          ])

          // Sync Users as Brokers (corretores/agents) - already filtered by company_id
          for (const user of users) {
            try {
              const [existing] = await db
                .select()
                .from(brokers)
                .where(eq(brokers.crm_external_id, user.id || ''))

              if (existing) {
                // Only update if belongs to this organization
                if (existing.organization_id === org.id) {
                  await db
                    .update(brokers)
                    .set({
                      name: user.full_name || `${user.first_name} ${user.last_name}`.trim(),
                      email: user.email,
                      phone: user.phone,
                      is_active: !user.disabled && user.status === 'active',
                    })
                    .where(eq(brokers.id, existing.id))
                }
              } else {
                await db
                  .insert(brokers)
                  .values({
                    id: crypto.randomUUID(),
                    organization_id: org.id,
                    name: user.full_name || `${user.first_name} ${user.last_name}`.trim(),
                    email: user.email,
                    phone: user.phone,
                    crm_external_id: user.id,
                    is_active: !user.disabled && user.status === 'active',
                  })
              }
              recordsProcessed++
            } catch (e) {
              // Continue on error
            }
          }

          // Create a map of clients by ID for easy lookup
          const clientMap = new Map(clients.map(c => [c.id, c]))

          // Sync deals for this organization
          for (const vetorDeal of dealsData) {
            try {
              // Find the broker by email (agent_email)
              const [broker] = await db
                .select()
                .from(brokers)
                .where(and(
                  eq(brokers.email, vetorDeal.agent_email || ''),
                  eq(brokers.organization_id, org.id)
                ))

              // Get client data if available
              const client = clientMap.get(vetorDeal.client_id || '')
              const clientName = client
                ? (client.full_name || `${client.first_name} ${client.last_name}`.trim())
                : (vetorDeal.title || 'Sem nome')
              const clientEmail = client?.email
              const clientPhone = client?.phone_primary

              // Create activity log from notes
              let dealId: string | undefined

              const [existingDeal] = await db
                .select()
                .from(deals)
                .where(and(
                  eq(deals.property_title, vetorDeal.title || ''),
                  eq(deals.organization_id, org.id)
                ))

              const dealData = {
                organization_id: org.id,
                broker_id: broker?.id,
                client_name: clientName,
                client_email: clientEmail || null,
                client_phone: clientPhone || null,
                property_title: vetorDeal.title,
                property_id: vetorDeal.property_ids?.[0],
                status: mapVetorStage(vetorDeal.stage),
                potential_value: vetorDeal.potential_value ? String(vetorDeal.potential_value) : undefined,
                last_activity: vetorDeal.last_activity_at ? new Date(vetorDeal.last_activity_at) : undefined,
                updated_at: new Date(),
              }

              if (existingDeal) {
                await db
                  .update(deals)
                  .set(dealData)
                  .where(eq(deals.id, existingDeal.id))
                dealId = existingDeal.id
              } else {
                const newDealId = crypto.randomUUID()
                await db
                  .insert(deals)
                  .values({
                    ...dealData,
                    id: newDealId,
                    created_at: new Date(),
                  })
                dealId = newDealId
              }

              // Create activity log from notes if present
              if (vetorDeal.notes && dealId) {
                await db
                  .insert(activityLogs)
                  .values({
                    id: crypto.randomUUID(),
                    deal_id: dealId,
                    type: 'note',
                    description: vetorDeal.notes,
                    created_at: new Date(vetorDeal.created_date),
                  })
              }

              recordsProcessed++
            } catch (e) {
              // Continue on error
            }
          }

          // Update sync log as success
          await db
            .update(syncLogs)
            .set({
              status: 'success',
              records_processed: recordsProcessed,
              completed_at: new Date(),
            })
            .where(eq(syncLogs.id, syncLog.id))

          totalRecordsProcessed += recordsProcessed
        } catch (error) {
          // Update sync log with error
          await db
            .update(syncLogs)
            .set({
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date(),
            })
            .where(eq(syncLogs.id, syncLog.id))
        }
      }

      // Sync Mada if configured
      if ((source === 'mada' || source === 'all') && org.crm_type === 'mada') {
        if (!org.crm_config?.mada_supabase_url || !org.crm_config?.mada_supabase_key) {
          return reply.status(400).send({
            error: 'Bad request',
            message: 'Mada API credentials not configured for this organization',
          })
        }

        // Create sync log entry for this organization
        const [syncLog] = await db
          .insert(syncLogs)
          .values({
            organization_id: org.id,
            source: 'mada',
            status: 'running',
            records_processed: 0,
            started_at: new Date(),
          })
          .returning()

        syncLogIds.push(syncLog.id)

        try {
          const { createMadaSyncService } = await import('../services/mada-sync.js')
          const madaService = createMadaSyncService(
            org.crm_config.mada_supabase_url,
            org.crm_config.mada_supabase_key
          )
          const conversations = await madaService.fetchRecentConversations(minutes)
          const result = await madaService.syncToVetorCore(conversations)

          await db
            .update(syncLogs)
            .set({
              status: 'success',
              records_processed: result.processed,
              completed_at: new Date(),
            })
            .where(eq(syncLogs.id, syncLog.id))

          totalRecordsProcessed += result.processed
        } catch (error) {
          await db
            .update(syncLogs)
            .set({
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date(),
            })
            .where(eq(syncLogs.id, syncLog.id))
        }
      }

      return reply.send({
        status: 'success',
        recordsProcessed: totalRecordsProcessed,
        message: `Sync triggered for ${source}`,
        syncLogIds,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to trigger sync',
      })
    }
  })

  // GET /api/sync/logs - Get sync logs for user's organization only
  fastify.get('/logs', {
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

      const logs = await db
        .select()
        .from(syncLogs)
        .where(eq(syncLogs.organization_id, user.organization_id))
        .orderBy(desc(syncLogs.started_at))
        .limit(50)

      return reply.send({ logs })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch sync logs',
      })
    }
  })
}

/**
 * Map Vetor Imobi stage to simplified status
 */
function mapVetorStage(stage: string): string {
  if (!stage) return 'New'
  if (stage.includes('perdido')) return 'Lost'
  if (stage.includes('fechado')) return 'Closed'
  if (stage.includes('proposta') || stage.includes('negociacao')) return 'Proposal'
  if (stage.includes('visita')) return 'Negotiation'
  if (stage.includes('qualificacao')) return 'Qualified'
  return 'New'
}
