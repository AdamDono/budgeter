import { fileURLToPath } from 'url'
import { pool } from './connection.js'

export const ensureDatabaseSchema = async () => {
  try {
    const queries = `
      -- 1. Credit scores table
      CREATE TABLE IF NOT EXISTS credit_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        provider VARCHAR(50) DEFAULT 'Manual'
      );

      -- 2. Savings pots table
      CREATE TABLE IF NOT EXISTS savings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        balance DECIMAL(15,2) DEFAULT 0.00,
        target_amount DECIMAL(15,2),
        interest_rate DECIMAL(5,2) DEFAULT 0.00,
        color VARCHAR(7) DEFAULT '#10B981',
        icon VARCHAR(50) DEFAULT 'piggy-bank',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Add credit_limit to accounts and debts if missing
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0.00;
      ALTER TABLE debts ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0.00;

      -- 4. Expand debts type check constraint to support SA vehicle-finance, store-card, bnpl
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'debts' AND constraint_name = 'debts_type_check'
        ) THEN
          ALTER TABLE debts DROP CONSTRAINT debts_type_check;
        END IF;
        ALTER TABLE debts ADD CONSTRAINT debts_type_check
          CHECK (type IN ('credit-card', 'personal-loan', 'student-loan', 'mortgage', 'vehicle-finance', 'store-card', 'bnpl', 'other'));
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;

      -- 5. Ensure linked foreign key columns exist on transactions
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS debt_id INTEGER REFERENCES debts(id) ON DELETE SET NULL;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS savings_id INTEGER REFERENCES savings(id) ON DELETE SET NULL;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bill_id INTEGER REFERENCES bill_reminders(id) ON DELETE SET NULL;

      -- 6. Ensure password reset columns on users
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expiry TIMESTAMP;

      -- 7. Ensure chat history tables exist
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES chat_conversations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Ensure default categories for Debt Repayment and Savings Contribution exist
      INSERT INTO budget_categories (user_id, name, icon, color)
      SELECT NULL, 'Debt Repayment', 'credit-card', '#EF4444'
      WHERE NOT EXISTS (SELECT 1 FROM budget_categories WHERE user_id IS NULL AND name = 'Debt Repayment');

      INSERT INTO budget_categories (user_id, name, icon, color)
      SELECT NULL, 'Savings Contribution', 'piggy-bank', '#10B981'
      WHERE NOT EXISTS (SELECT 1 FROM budget_categories WHERE user_id IS NULL AND name = 'Savings Contribution');
    `

    await pool.query(queries)
    console.log('✅ Database schema verified & synchronized')
  } catch (err) {
    console.warn('⚠️ Schema auto-sync warning (non-fatal):', err.message)
  }
}

// Allow running directly via `node database/runMigrations.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🔄 Starting database migrations...')
  ensureDatabaseSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err)
      process.exit(1)
    })
}
