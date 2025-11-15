import { pool } from '../database/connection.js'

async function setupDefaultAccount(userId) {
  try {
    console.log(`🚀 Setting up default account for user ${userId}...`)
    
    // Check if user already has an account
    const existingAccount = await pool.query(
      'SELECT id FROM accounts WHERE user_id = $1 LIMIT 1',
      [userId]
    )
    
    if (existingAccount.rows.length > 0) {
      console.log('✅ User already has an account')
      return
    }
    
    // Get checking account type
    const accountTypeResult = await pool.query(
      "SELECT id FROM account_types WHERE name = 'Checking' LIMIT 1"
    )
    
    if (accountTypeResult.rows.length === 0) {
      console.error('❌ Checking account type not found')
      return
    }
    
    const accountTypeId = accountTypeResult.rows[0].id
    
    // Create default checking account
    const result = await pool.query(
      `INSERT INTO accounts (user_id, account_type_id, name, bank_name, balance, currency)
       VALUES ($1, $2, 'My Account', 'Default Bank', 0.00, 'ZAR')
       RETURNING id`,
      [userId, accountTypeId]
    )
    
    console.log(`✅ Default account created: ${result.rows[0].id}`)
  } catch (error) {
    console.error('❌ Setup failed:', error)
  } finally {
    process.exit(0)
  }
}

// Get user ID from command line or use 1 as default
const userId = process.argv[2] || 1
setupDefaultAccount(parseInt(userId))
