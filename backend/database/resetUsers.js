import pool from './connection.js'

async function resetUsers() {
  console.log('⚠️  WARNING: This will delete ALL users and ALL their associated data (transactions, accounts, goals, etc) from the database.')
  console.log('Connecting to database to wipe users...')
  
  try {
    // We begin a transaction just in case, though it's a single query
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      // Delete all users. ON DELETE CASCADE will handle all related tables
      const result = await client.query('DELETE FROM users RETURNING id')
      
      await client.query('COMMIT')
      console.log(`✅ Successfully wiped ${result.rowCount} users and all their associated data.`)
      console.log('🎉 Your database is now fresh and ready for new signups!')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Failed to wipe users:', error)
  } finally {
    // Close the pool so the script exits
    await pool.end()
    process.exit(0)
  }
}

resetUsers()
