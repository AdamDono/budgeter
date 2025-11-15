import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool } from '../database/connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...')
    
    // Read and execute schema
    const schemaPath = join(__dirname, '../database/schema.sql')
    const schema = readFileSync(schemaPath, 'utf8')
    
    await pool.query(schema)
    
    console.log('✅ Database migration completed successfully!')
    console.log('📊 Tables created:')
    console.log('   - users')
    console.log('   - account_types')
    console.log('   - accounts')
    console.log('   - budget_categories')
    console.log('   - goals')
    console.log('   - transactions')
    console.log('   - recurring_transactions')
    console.log('   - bill_reminders')
    console.log('   - user_settings')
    console.log('   - notifications')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
