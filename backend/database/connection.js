import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()
// Fix for Aiven/hosted PG SSL issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const { Pool } = pg

const config = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,                        // fewer connections = less idle drops
  idleTimeoutMillis: 20000,       // drop idle connections after 20s (before Aiven kills them)
  connectionTimeoutMillis: 15000, // wait up to 15s to get a connection
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
}

export const pool = process.env.DATABASE_URL
  ? new Pool(config)
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'pacedebt',
      password: process.env.DB_PASSWORD || 'Fliph106',
      port: process.env.DB_PORT || 5433,
      ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('aivencloud.com')
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    })

// Test connection
pool.on('connect', () => {
  console.log('📊 Connected to PostgreSQL database')
})

// DON'T exit on connection drop — Aiven free tier drops idle connections.
// The pool will automatically reconnect on the next request.
pool.on('error', (err) => {
  console.error('⚠️  DB pool error (will auto-reconnect):', err.message)
})

export default pool
