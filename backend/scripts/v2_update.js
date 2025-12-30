
import { pool } from '../database/connection.js';

async function migrate() {
    console.log('🚀 Starting V2 Migration (Debt & Savings Integration)...');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        console.log('📦 Creating savings table...');
        await client.query(`
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
            )
        `);

        console.log('🔗 Adding linking columns to transactions...');
        // Check if columns exist first to avoid errors on re-run
        const checkDebtColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='transactions' AND column_name='debt_id'
        `);
        
        if (checkDebtColumn.rows.length === 0) {
            await client.query('ALTER TABLE transactions ADD COLUMN debt_id INTEGER REFERENCES debts(id) ON DELETE SET NULL');
        }

        const checkSavingsColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='transactions' AND column_name='savings_id'
        `);
        
        if (checkSavingsColumn.rows.length === 0) {
            await client.query('ALTER TABLE transactions ADD COLUMN savings_id INTEGER REFERENCES savings(id) ON DELETE SET NULL');
        }

        console.log('✅ Migration successful!');
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
