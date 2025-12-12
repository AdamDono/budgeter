import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../database/connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database...')

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    for (const statement of statements) {
      try {
        await pool.query(statement)
        console.log('✅ Executed statement')
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists')) {
          console.log('⏭️  Table already exists, skipping...')
        } else {
          console.error('❌ Error executing statement:', error.message)
        }
      }
    }

    console.log('✅ Database setup complete!')
    console.log('\n📊 Tables created:')
    console.log('  - users')
    console.log('  - accounts')
    console.log('  - budget_categories')
    console.log('  - transactions')
    console.log('  - goals')
    console.log('  - recurring_transactions')
    console.log('  - debts ✨ NEW')
    console.log('  - tax_deductions ✨ NEW')
    console.log('  - budget_tips ✨ NEW')
    console.log('  - tip_likes ✨ NEW')
    console.log('  - tip_comments ✨ NEW')

    process.exit(0)
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

setupDatabase()
