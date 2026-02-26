import { eq } from 'drizzle-orm'
import { createMadaSyncService } from './mada-sync.js'
import { VetorImobiAdapter } from './vetor-api.js'
import { db, withRetry } from '../db/index.js'
import { syncLogs, organizations, brokers, deals, activityLogs } from '../db/schema.js'

// Parse cron expression to get interval in milliseconds
function parseCronInterval(cronExpression: string): number {
  // Simple parser for "*/N * * * *" format (every N minutes)
  const match = cronExpression.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*\*?$/)
  if (match) {
    return parseInt(match[1]) * 60 * 1000 // Convert minutes to milliseconds
  }
  // Default to 5 minutes if format doesn't match
  return 5 * 60 * 1000
}

// Start Mada Sync Job - runs every 5 minutes
export function startMadaSyncJob(cronExpression: string = '*/5 * * * *') {
  const interval = parseCronInterval(cronExpression)

  const task = setInterval(async () => {
    console.log('[Mada Sync] Starting at ' + new Date().toISOString())

    try {
      // Fetch all organizations with Mada CRM configured
      const madaOrgs = await withRetry(() =>
        db.select().from(organizations).where(eq(organizations.crm_type, 'mada'))
      )

      console.log('[Mada Sync] Found ' + madaOrgs.length + ' organizations with Mada CRM')

      for (const org of madaOrgs) {
        if (!org.crm_config?.mada_supabase_url || !org.crm_config?.mada_supabase_key) {
          console.log('[Mada Sync] Skipping organization ' + org.id + ' - missing credentials')
          continue
        }

        const syncLogId = crypto.randomUUID()
        const startTime = new Date()

        try {
          // Create sync log entry
          await db.insert(syncLogs).values({
            id: syncLogId,
            organization_id: org.id,
            source: 'mada',
            status: 'running',
            records_processed: 0,
            started_at: startTime,
          })

          // Create Mada service with org-specific credentials
          const madaService = createMadaSyncService(
            org.crm_config.mada_supabase_url,
            org.crm_config.mada_supabase_key
          )

          // Fetch recent conversations
          const conversations = await madaService.fetchRecentConversations(5)
          console.log('[Mada Sync] Org ' + org.id + ': Found ' + conversations.length + ' recent conversations')

          // Sync to database
          const result = await madaService.syncToVetorCore(conversations)

          // Update sync log
          await db.update(syncLogs)
            .set({
              status: 'success',
              records_processed: result.processed,
              completed_at: new Date(),
              error_message: result.errors.length > 0 ? result.errors.join('\n') : null,
            })
            .where(eq(syncLogs.id, syncLogId))

          console.log('[Mada Sync] Org ' + org.id + ': Completed - ' + result.processed + ' records processed, ' + result.errors.length + ' errors')
        } catch (error) {
          console.error('[Mada Sync] Org ' + org.id + ': Error:', error)

          // Update sync log with error
          await db.update(syncLogs)
            .set({
              status: 'error',
              completed_at: new Date(),
              error_message: String(error),
            })
            .where(eq(syncLogs.id, syncLogId))
        }
      }
    } catch (error) {
      console.error('[Mada Sync] Error:', error)
    }
  }, interval)

  console.log('[Mada Sync] Scheduled with interval: ' + (interval / 60000) + ' minutes')
  return task
}

// Sync Vetor Notes as activity logs
async function syncVetorNotes(organizationId: string, apiKey: string, companyId?: string) {
  try {
    const adapter = new VetorImobiAdapter(apiKey, undefined, companyId)

    // Fetch notes from Vetor using the adapter's fetchNotes method
    const notes = await adapter.fetchNotes()
    console.log('[Vetor Notes Sync] Found ' + notes.length + ' notes')

    for (const note of notes) {
      try {
        // Skip archived notes
        if (note.is_archived) continue

        // Find related deal if deal_id exists
        let dealId = null
        if (note.deal_id) {
          const [deal] = await db.select()
            .from(deals)
            .where(eq(deals.external_id, note.deal_id))

          dealId = deal?.id || null
        }

        // Create activity log for the note
        await db.insert(activityLogs).values({
          id: crypto.randomUUID(),
          deal_id: dealId || crypto.randomUUID(), // TODO: handle notes without deals better
          type: 'note',
          description: note.content || note.title || '',
          metadata: {
            crm_note_id: note.id,
            title: note.title,
            note_type: note.note_type,
            priority: note.priority,
            agent_email: note.agent_email,
            assigned_by: note.assigned_by,
            due_date: note.due_date,
            is_completed: note.is_completed,
            visit_form_id: note.visit_form_id,
            visit_form_status: note.visit_form_status,
            property_id: note.property_id,
            client_id: note.client_id,
          },
          created_at: new Date(note.created_date || note.updated_date || Date.now()),
        }).onConflictDoNothing() // Avoid duplicates
      } catch (error) {
        console.error('[Vetor Notes Sync] Error syncing note ' + note.id + ':', error)
      }
    }

    console.log('[Vetor Notes Sync] Completed')
  } catch (error) {
    console.error('[Vetor Notes Sync] Error:', error)
  }
}

// Map Vetor stage to status
function mapVetorStage(stage: string): string {
  if (!stage) return 'New'
  if (stage.includes('perdido')) return 'Lost'
  if (stage.includes('fechado')) return 'Closed'
  if (stage.includes('proposta') || stage.includes('negociacao')) return 'Proposal'
  if (stage.includes('visita')) return 'Negotiation'
  if (stage.includes('qualificacao')) return 'Qualified'
  return 'New'
}

// Start Vetor Sync Job - runs every 30 minutes
export function startVetorSyncJob(cronExpression: string = '*/30 * * * *') {
  const interval = parseCronInterval(cronExpression)

  const task = setInterval(async () => {
    console.log('[Vetor Sync] Starting at ' + new Date().toISOString())

    try {
      // Fetch all organizations with Vetor CRM configured
      const vetorOrgs = await withRetry(() =>
        db.select().from(organizations).where(eq(organizations.crm_type, 'vetor'))
      )

      console.log('[Vetor Sync] Found ' + vetorOrgs.length + ' organizations with Vetor CRM')

      for (const org of vetorOrgs) {
        if (!org.crm_config?.vetor_api_key) {
          console.log('[Vetor Sync] Skipping organization ' + org.id + ' - missing API key')
          continue
        }

        const syncLogId = crypto.randomUUID()
        const startTime = new Date()
        let processed = 0

        try {
          // Create sync log entry
          await db.insert(syncLogs).values({
            id: syncLogId,
            organization_id: org.id,
            source: 'vetor_imobi',
            status: 'running',
            records_processed: 0,
            started_at: startTime,
          })

          // Create Vetor adapter with org-specific credentials
          const vetorAdapter = new VetorImobiAdapter(
            org.crm_config.vetor_api_key,
            undefined,
            org.crm_config.vetor_company_id || org.company_id || undefined
          )

          // Fetch recent data
          const { users, clients, deals: vetorDeals, properties } = await vetorAdapter.fetchRecentlyModified(30)
          console.log('[Vetor Sync] Org ' + org.id + ': Found ' + users.length + ' users, ' + clients.length + ' clients, ' + vetorDeals.length + ' deals, ' + properties.length + ' properties')

          // Sync users as brokers (Users = corretores/agentes, NOT clients)
          for (const user of users) {
            try {
              const [existing] = await db.select()
                .from(brokers)
                .where(eq(brokers.crm_external_id, user.id || ''))

              const brokerData = {
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email,
                phone: user.phone,
                is_active: !user.disabled && user.status === 'active',
              }

              // Log first user for debug
              if (processed === 0) {
                console.log('[Vetor Sync] Sample user data:', JSON.stringify({ id: user.id, ...brokerData }))
              }

              if (existing) {
                await db.update(brokers)
                  .set(brokerData)
                  .where(eq(brokers.id, existing.id))
              } else {
                await db.insert(brokers).values({
                  id: crypto.randomUUID(),
                  organization_id: org.id,
                  crm_external_id: user.id,
                  ...brokerData,
                })
              }
              processed++
            } catch (error) {
              console.error('[Vetor Sync] Error syncing user ' + user.id + ':', error)
            }
          }

          // Sync deals
          for (const vetorDeal of vetorDeals) {
            try {
              const [broker] = await db.select()
                .from(brokers)
                .where(eq(brokers.email, vetorDeal.agent_email || ''))

              const [existingDeal] = await db.select()
                .from(deals)
                .where(eq(deals.property_title, vetorDeal.title || ''))

              const dealData = {
                organization_id: org.id,
                broker_id: broker?.id,
                client_name: vetorDeal.title || 'Sem nome',
                property_title: vetorDeal.title,
                property_id: vetorDeal.property_ids?.[0],
                external_id: vetorDeal.id,
                status: mapVetorStage(vetorDeal.stage),
                potential_value: vetorDeal.potential_value ? String(vetorDeal.potential_value) : undefined,
                last_activity: vetorDeal.last_activity_at ? new Date(vetorDeal.last_activity_at) : undefined,
                // New Vetor fields
                stage: vetorDeal.stage,
                stage_entered_at: vetorDeal.stage_entered_at ? new Date(vetorDeal.stage_entered_at) : undefined,
                potential_commission: vetorDeal.potential_commission || undefined,
                exclusividade: vetorDeal.exclusividade || undefined,
                origem: vetorDeal.origem || vetorDeal.source || undefined,
                updated_at: new Date(),
              }

              // Log first deal for debug
              if (processed === 0) {
                console.log('[Vetor Sync] Sample deal data:', JSON.stringify({
                  id: vetorDeal.id,
                  stage: vetorDeal.stage,
                  exclusividade: vetorDeal.exclusividade,
                  origem: vetorDeal.origem,
                  potential_commission: vetorDeal.potential_commission,
                }))
              }

              if (existingDeal) {
                await db.update(deals)
                  .set(dealData)
                  .where(eq(deals.id, existingDeal.id))
              } else {
                await db.insert(deals).values({
                  ...dealData,
                  id: crypto.randomUUID(),
                  created_at: new Date(),
                })
              }
              processed++
            } catch (error) {
              console.error('[Vetor Sync] Error syncing deal ' + vetorDeal.id + ':', error)
            }
          }

          // Sync Notes from Vetor
          await syncVetorNotes(org.id, org.crm_config.vetor_api_key, org.crm_config.vetor_company_id || org.company_id || undefined)

          // Update sync log
          await db.update(syncLogs)
            .set({
              status: 'success',
              records_processed: processed,
              completed_at: new Date(),
            })
            .where(eq(syncLogs.id, syncLogId))

          console.log('[Vetor Sync] Org ' + org.id + ': Completed - ' + processed + ' records processed')
        } catch (error) {
          console.error('[Vetor Sync] Org ' + org.id + ': Error:', error)

          // Update sync log with error
          await db.update(syncLogs)
            .set({
              status: 'error',
              completed_at: new Date(),
              error_message: String(error),
            })
            .where(eq(syncLogs.id, syncLogId))
        }
      }
    } catch (error) {
      console.error('[Vetor Sync] Error:', error)
    }
  }, interval)

  console.log('[Vetor Sync] Scheduled with interval: ' + (interval / 60000) + ' minutes')
  return task
}

// Start all cron jobs
export function startAllCronJobs() {
  console.log('[Cron Jobs] Starting all scheduled tasks...')

  const madaCron = process.env.MADA_SYNC_CRON || '*/5 * * * *'
  const vetorCron = process.env.VETOR_SYNC_CRON || '*/30 * * * *'

  const madaTask = startMadaSyncJob(madaCron)
  const vetorTask = startVetorSyncJob(vetorCron)

  console.log('[Cron Jobs] All tasks started successfully')

  return {
    mada: madaTask,
    vetor: vetorTask,
  }
}
