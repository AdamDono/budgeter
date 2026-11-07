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

      -- 9. Clean up any false-positive goal_id links on Card Purchases / Uber transactions
      --    (e.g., where "(Card 5797)" falsely matched a Goal named "Car") and restore goal current_amount
      WITH false_goal_tx AS (
        UPDATE transactions
        SET goal_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE goal_id IS NOT NULL
          AND (
            description ILIKE '%card purchase%'
            OR description ILIKE '%(card %'
            OR description ILIKE '%uber%'
            OR description ILIKE '%bolt%'
            OR description ILIKE '%pos purchase%'
          )
        RETURNING goal_id, amount
      ),
      goal_deltas AS (
        SELECT goal_id, SUM(amount) AS total_falsely_added
        FROM false_goal_tx
        GROUP BY goal_id
      )
      UPDATE goals g
      SET current_amount = GREATEST(0, g.current_amount - gd.total_falsely_added),
          updated_at = CURRENT_TIMESTAMP
      FROM goal_deltas gd
      WHERE g.id = gd.goal_id;

      -- 10. Automatically remove duplicate imported transactions (same user, type, amount, date, description)
      --     and reverse their duplicate impact on account, debt, savings, and goal balances
      WITH ranked_tx AS (
        SELECT id, user_id, account_id, debt_id, savings_id, goal_id, type, amount,
               ROW_NUMBER() OVER (
                 PARTITION BY user_id, type, amount, transaction_date, LOWER(TRIM(description))
                 ORDER BY id ASC
               ) AS rn
        FROM transactions
      ),
      deleted_dups AS (
        DELETE FROM transactions t
        USING ranked_tx r
        WHERE t.id = r.id AND r.rn > 1
        RETURNING t.account_id, t.debt_id, t.savings_id, t.goal_id, t.type, t.amount
      ),
      acct_fix AS (
        UPDATE accounts a
        SET balance = a.balance + sub.delta
        FROM (
          SELECT account_id, SUM(CASE WHEN type = 'income' THEN -amount ELSE amount END) AS delta
          FROM deleted_dups
          WHERE account_id IS NOT NULL
          GROUP BY account_id
        ) sub
        WHERE a.id = sub.account_id
      ),
      debt_fix AS (
        UPDATE debts d
        SET balance = d.balance + sub.delta
        FROM (
          SELECT debt_id, SUM(amount) AS delta
          FROM deleted_dups
          WHERE debt_id IS NOT NULL AND type = 'expense'
          GROUP BY debt_id
        ) sub
        WHERE d.id = sub.debt_id
      ),
      sav_fix AS (
        UPDATE savings s
        SET balance = GREATEST(0, s.balance - sub.delta)
        FROM (
          SELECT savings_id, SUM(CASE WHEN type = 'expense' THEN amount ELSE -amount END) AS delta
          FROM deleted_dups
          WHERE savings_id IS NOT NULL
          GROUP BY savings_id
        ) sub
        WHERE s.id = sub.savings_id
      )
      UPDATE goals g
      SET current_amount = GREATEST(0, g.current_amount - sub.delta)
      FROM (
        SELECT goal_id, SUM(amount) AS delta
        FROM deleted_dups
        WHERE goal_id IS NOT NULL
        GROUP BY goal_id
      ) sub
      WHERE g.id = sub.goal_id;
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
