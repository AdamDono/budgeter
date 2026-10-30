import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()
// Fix for Aiven/hosted PG SSL issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const { Pool } = pg

const basePoolOptions = {
  max: 8,                         // Optimal for Aiven free tier connection limits
  min: 1,                         // Keep at least 1 warm connection in the pool
  idleTimeoutMillis: 25000,       // Recycle idle connections before Aiven's load balancer drops them
  connectionTimeoutMillis: 20000, // Allow up to 20s if Aiven is waking up
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
}

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      ...basePoolOptions,
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'pacedebt',
      password: process.env.DB_PASSWORD || 'Fliph106',
      port: process.env.DB_PORT || 5433,
      ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('aivencloud.com')
        ? { rejectUnauthorized: false }
        : false,
      ...basePoolOptions,
    })

// Transparent auto-retry wrapper for `pool.query` to handle Aiven idle socket drops / wakeups seamlessly
const rawQuery = pool.query.bind(pool)
const TRANSIENT_ERROR_PATTERNS = [
  'Connection terminated',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now (waking up)
  '08006', // connection_failure
  '08003', // connection_does_not_exist
  'Client has encountered a connection error',
]

function isTransientDbError(err) {
  if (!err) return false
  const msg = `${err.message || ''} ${err.code || ''}`
  return TRANSIENT_ERROR_PATTERNS.some(pattern => msg.includes(pattern))
}

pool.query = async (...args) => {
  // If callback style is used, pass through directly
  if (typeof args[args.length - 1] === 'function') {
    return rawQuery(...args)
  }

  let lastError
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await rawQuery(...args)
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts && isTransientDbError(err)) {
        const delayMs = attempt * 400
        console.warn(`🔄 [DB] Transient Aiven connection drop (${err.message}). Retrying (${attempt}/${maxAttempts}) in ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }
      throw err
    }
  }
  throw lastError
}

// Log connection events
pool.on('connect', () => {
  console.log('📊 Connected to PostgreSQL database')
})

// Never exit on idle connection drops; pool will automatically open a fresh socket
pool.on('error', (err) => {
  console.error('⚠️  DB pool idle socket reset (auto-recovering):', err.message)
})

export default pool
