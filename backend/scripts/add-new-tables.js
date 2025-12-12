import { pool } from '../database/connection.js'

async function addNewTables() {
  try {
    console.log('🔧 Adding new tables to database...\n')

    // 1. Create debts table
    console.log('📊 Creating debts table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS debts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        balance DECIMAL(15,2) NOT NULL,
        interest_rate DECIMAL(5,2) NOT NULL,
        monthly_payment DECIMAL(10,2) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('credit-card', 'personal-loan', 'student-loan', 'mortgage', 'other')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id)')
    console.log('✅ debts table created')

    // 2. Create tax_deductions table
    console.log('📊 Creating tax_deductions table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tax_deductions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        description VARCHAR(500) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        receipt VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tax_deductions_user ON tax_deductions(user_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tax_deductions_date ON tax_deductions(date)')
    console.log('✅ tax_deductions table created')

    // 3. Create budget_tips table
    console.log('📊 Creating budget_tips table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budget_tips (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('saving', 'budgeting', 'investing', 'debt', 'lifestyle')),
        details JSONB,
        is_published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_budget_tips_user ON budget_tips(user_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_budget_tips_category ON budget_tips(category)')
    console.log('✅ budget_tips table created')

    // 4. Create tip_likes table
    console.log('📊 Creating tip_likes table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tip_likes (
        id SERIAL PRIMARY KEY,
        tip_id INTEGER REFERENCES budget_tips(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tip_id, user_id)
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tip_likes_tip ON tip_likes(tip_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tip_likes_user ON tip_likes(user_id)')
    console.log('✅ tip_likes table created')

    // 5. Create tip_comments table
    console.log('📊 Creating tip_comments table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tip_comments (
        id SERIAL PRIMARY KEY,
        tip_id INTEGER REFERENCES budget_tips(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tip_comments_tip ON tip_comments(tip_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tip_comments_user ON tip_comments(user_id)')
    console.log('✅ tip_comments table created')

    console.log('\n✅ All new tables created successfully!\n')
    console.log('📊 Tables added:')
    console.log('  ✓ debts')
    console.log('  ✓ tax_deductions')
    console.log('  ✓ budget_tips')
    console.log('  ✓ tip_likes')
    console.log('  ✓ tip_comments')
    console.log('\n🎉 Database migration complete!')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error adding tables:', error.message)
    process.exit(1)
  }
}

addNewTables()
