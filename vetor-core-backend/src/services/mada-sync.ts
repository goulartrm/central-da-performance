import type {
  MadaConversation,
  Sentiment,
  SyncResult,
} from '../types/index.js'

/**
 * Mada Sync Service
 *
 * Integrates with Mada's Supabase database to fetch AI-powered conversations,
 * summaries, and sentiment analysis.
 *
 * This service polls the Supabase database directly to get recent conversations
 * and updates the Vetor Core database with new insights.
 */
export class MadaSyncService {
  private readonly supabaseUrl: string
  private readonly supabaseKey: string

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseUrl = supabaseUrl
    this.supabaseKey = supabaseKey
  }

  /**
   * Fetch recent conversations from Mada's Supabase
   *
   * @param minutes - How many minutes back to look for updates
   * @returns Array of recent conversations with AI summaries
   */
  async fetchRecentConversations(minutes: number = 10): Promise<MadaConversation[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString()

    // Query Supabase for conversations updated since {minutes} ago
    const url = new URL(`${this.supabaseUrl}/rest/v1/conversations`)

    // Add Supabase query parameters
    url.searchParams.set('updated_at', `gte.${since}`)
    url.searchParams.set('order', 'updated_at.desc')
    url.searchParams.set('limit', '100')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Mada Supabase error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return data as MadaConversation[]
  }

  /**
   * Fetch sentiment updates from Mada's Supabase
   *
   * @param minutes - How many minutes back to look for updates
   * @returns Array of sentiment updates
   */
  async fetchSentimentUpdates(minutes: number = 10): Promise<
    Array<{
      deal_id: string
      sentiment: Sentiment
      updated_at: string
    }>
  > {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString()

    // Query Supabase for sentiment updates
    const url = new URL(`${this.supabaseUrl}/rest/v1/sentiment_updates`)

    url.searchParams.set('updated_at', `gte.${since}`)
    url.searchParams.set('order', 'updated_at.desc')
    url.searchParams.set('limit', '100')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Mada Supabase error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return data
  }

  /**
   * Sync Mada data to Vetor Core database
   *
   * This method fetches recent conversations from Mada's Supabase
   * and updates the local Vetor Core database with new summaries,
   * sentiment analysis, and activity logs.
   *
   * @param conversations - Array of conversations to sync
   * @returns Sync result with statistics
   */
  async syncToVetorCore(conversations: MadaConversation[]): Promise<SyncResult> {
    const { db } = await import('../db/index.js')
    const { deals, activityLogs } = await import('../db/schema.js')
    const { eq } = await import('drizzle-orm')

    let processed = 0
    const errors: string[] = []

    for (const conversation of conversations) {
      try {
        // Match conversations to deals by broker phone and client phone
        // The conversation should have metadata that links to a deal
        const dealId = conversation.deal_id ||
                       conversation.metadata?.deal_id

        if (!dealId) {
          errors.push(`Conversation ${conversation.id} has no associated deal_id`)
          continue
        }

        // Check if deal exists
        const [existingDeal] = await db
          .select()
          .from(deals)
          .where(eq(deals.id, dealId))

        if (!existingDeal) {
          errors.push(`Deal ${dealId} not found for conversation ${conversation.id}`)
          continue
        }

        // Update deal with AI summary and sentiment
        await db
          .update(deals)
          .set({
            smart_summary: conversation.summary || existingDeal.smart_summary,
            sentiment: conversation.sentiment || existingDeal.sentiment,
            last_activity: new Date(conversation.updated_at),
            updated_at: new Date(),
          })
          .where(eq(deals.id, dealId))

        // Create activity log for the conversation summary
        await db
          .insert(activityLogs)
          .values({
            deal_id: dealId,
            type: 'ConversationSummary',
            description: conversation.summary || 'AI conversation summary',
            metadata: {
              sentiment: conversation.sentiment,
              conversation_id: conversation.id,
              transcription_length: conversation.transcription?.length || 0,
            } as Record<string, unknown>,
          })

        processed++
      } catch (error) {
        errors.push(`Failed to sync conversation ${conversation.id}: ${error}`)
      }
    }

    return {
      success: errors.length === 0,
      processed,
      errors,
      timestamp: new Date(),
    }
  }

  /**
   * Test the connection to Mada's Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = new URL(`${this.supabaseUrl}/rest/v1/conversations`)
      url.searchParams.set('limit', '1')

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
      })

      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Create a Mada Sync Service instance with provided credentials
 */
export function createMadaSyncService(supabaseUrl?: string, supabaseKey?: string): MadaSyncService {
  const url = supabaseUrl || process.env.MADA_SUPABASE_URL
  const key = supabaseKey || process.env.MADA_SUPABASE_KEY

  if (!url) {
    throw new Error('MADA_SUPABASE_URL is required (provide as parameter or set environment variable)')
  }

  if (!key) {
    throw new Error('MADA_SUPABASE_KEY is required (provide as parameter or set environment variable)')
  }

  return new MadaSyncService(url, key)
}

/**
 * Sync result type for tracking sync operations
 */
export interface SyncResultType {
  success: boolean
  processed: number
  errors: string[]
  timestamp: Date
}
