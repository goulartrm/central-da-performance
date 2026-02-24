import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// Load environment variables first
config()

// Create Neon connection with connection pooling and retry logic
const sql = neon(process.env.DATABASE_URL || '', {
  // Enable connection pooling for better performance
  fetchConnectionCache: true,
  // Retry configuration
  retry: {
    attempts: 3,
    delay: 100,
  },
  // Connection timeout
  connectionTimeout: 10000,
})

// Create Drizzle instance
export const db = drizzle(sql, { schema })

/**
 * Helper function to retry database operations with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 200
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Check if it's a connection error that should be retried
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes('fetch failed') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('connection'))

      if (!isConnectionError || attempt === maxRetries - 1) {
        throw error
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`Database operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Export schema for convenience
export * from './schema'
