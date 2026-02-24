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

// ============================================================================
// CRITICAL SECURITY: Validate required environment variables
// ============================================================================
const requiredEnvVars = ['JWT_SECRET'] as const
const missingEnvVars: string[] = []

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingEnvVars.push(envVar)
  }
}

if (missingEnvVars.length > 0) {
  console.error('❌ CRITICAL: Missing required environment variables:')
  console.error(`   ${missingEnvVars.join(', ')}`)
  console.error('\n   Please set these environment variables before starting the server.')
  console.error('   The server will NOT start without these for security reasons.\n')
  process.exit(1)
}

// ============================================================================
// CORS Configuration - Secure by default
// ============================================================================
// Parse allowed origins from environment variable
// Format: comma-separated list of origins, e.g., "https://app.example.com,https://api.example.com"
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS

let allowedOrigins: string[] | boolean = []

if (allowedOriginsEnv) {
  // Split by comma and trim each origin
  allowedOrigins = allowedOriginsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0)
} else {
  // In development, you can set ALLOWED_ORIGINS to "*" to allow all origins
  // In production, this MUST be set explicitly
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ CRITICAL: ALLOWED_ORIGINS not set in production!')
    console.error('   Please set ALLOWED_ORIGINS environment variable.')
    console.error('   Example: ALLOWED_ORIGINS=https://app.example.com,https://api.example.com\n')
    process.exit(1)
  } else {
    // Development: warn but allow localhost for testing
    console.warn('⚠️  Warning: ALLOWED_ORIGINS not set. Allowing localhost only for development.')
    allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ]
  }
}

await fastify.register(cors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  // Additional security headers
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // 10 minutes preflight cache
})

// ============================================================================
// JWT Configuration - No fallback secrets
// ============================================================================
await fastify.register(jwt, {
  secret: process.env.JWT_SECRET!, // Non-null assertion ensured by validation above
  sign: {
    expiresIn: '7d', // Tokens expire in 7 days
    iss: 'vetor-core', // Issuer
  },
  verify: {
    expiresIn: '7d',
    iss: 'vetor-core',
    maxAge: '7d', // Maximum age of token
  },
  // Decode cookies for cookie-based auth (if needed)
  cookie: {
    cookieName: 'token',
    signed: false,
  },
})

// ============================================================================
// Security Headers Middleware
// ============================================================================
fastify.addHook('onRequest', async (request, reply) => {
  // Set security headers
  reply.header('X-Content-Type-Options', 'nosniff')
  reply.header('X-Frame-Options', 'DENY')
  reply.header('X-XSS-Protection', '1; mode=block')
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // Remove X-Powered-By header (doesn't expose server info)
  reply.removeHeader('X-Powered-By')
})

// Health check endpoint (public, no auth)
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  }
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
    console.log(`🔒 Security: Authentication enabled`)
    console.log(`🌍 CORS: ${Array.isArray(allowedOrigins) ? allowedOrigins.length : 'ALL'} origin(s) allowed`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
