import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const runMigrations = async () => {
  try {
    console.log('🔄 Starting database migrations...')
    
    // Read schema.sql or migrations.sql
    // For now, let's just run the new credit_scores table and potential missing columns
    const queries = `
      CREATE TABLE IF NOT EXISTS credit_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        provider VARCHAR(50) DEFAULT 'Manual'
      );

      -- Add credit_limit to accounts if not exists (for credit cards/overdrafts)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='credit_limit') THEN
          ALTER TABLE accounts ADD COLUMN credit_limit DECIMAL(15,2) DEFAULT 0.00;
        END IF;
      END $$;

      -- Add credit_limit to debts if not exists
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='debts' AND column_name='credit_limit') THEN
          ALTER TABLE debts ADD COLUMN credit_limit DECIMAL(15,2) DEFAULT 0.00;
        END IF;
      END $$;
    `

    await pool.query(queries)
    console.log('✅ Migrations completed successfully')
    process.exit(0)
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  }
}

runMigrations()
