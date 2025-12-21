import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

export const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'pacedebt',
      password: process.env.DB_PASSWORD || 'Fliph106',
      port: process.env.DB_PORT || 5433,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
