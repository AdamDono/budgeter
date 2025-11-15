import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'budgeter',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
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
