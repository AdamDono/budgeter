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
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true
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
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true
    })

// Test connection
pool.on('connect', () => {
  console.log('📊 Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('Database connection error:', err)
  process.exit(-1)
})

export default pool
