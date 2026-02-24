import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { config } from 'dotenv'

// Load environment variables
config()

// Import routes
import dashboardRoutes from './routes/dashboard.js'
import dealsRoutes from './routes/deals.js'
import syncRoutes from './routes/sync.js'
import brokersRoutes from './routes/brokers.js'
import authRoutes from './routes/auth.js'
import superadminRoutes from './routes/superadmin.js'

// Import cron jobs
import { startAllCronJobs } from './services/cron-jobs.js'

// Create Fastify instance
const fastify = Fastify({
  logger: true,
})

// Register CORS
// In production, set ALLOWED_ORIGINS to comma-separated list of allowed domains
// In development, allows all origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : true

await fastify.register(cors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
})

// Register JWT
await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
})

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' })
await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' })
await fastify.register(dealsRoutes, { prefix: '/api/deals' })
await fastify.register(syncRoutes, { prefix: '/api/sync' })
await fastify.register(brokersRoutes, { prefix: '/api/brokers' })
await fastify.register(superadminRoutes, { prefix: '/api/superadmin' })

// Start cron jobs
if (process.env.NODE_ENV !== 'test') {
  startAllCronJobs()
}

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10)
    const host = process.env.HOST || '0.0.0.0'

    await fastify.listen({ port, host })

    console.log(`🚀 Vetor Core Backend running on http://${host}:${port}`)
    console.log(`📊 Health check: http://${host}:${port}/health`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
