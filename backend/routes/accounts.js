import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'

const router = express.Router()

// Validation schemas
const accountSchema = Joi.object({
  accountTypeId: Joi.number().integer().required(),
  name: Joi.string().min(2).max(100).required(),
  bankName: Joi.string().max(100).optional(),
  accountNumber: Joi.string().max(50).optional(),
  balance: Joi.number().default(0)
})

// Get all accounts for user
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        at.name as account_type_name,
        at.icon as account_type_icon
      FROM accounts a
      JOIN account_types at ON a.account_type_id = at.id
      WHERE a.user_id = $1 AND a.is_active = TRUE
      ORDER BY a.created_at DESC
    `, [req.user.id])

    res.json({ accounts: result.rows })
  } catch (error) {
    next(error)
  }
})

// Get account types
router.get('/types', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM account_types ORDER BY name')
    res.json({ accountTypes: result.rows })
  } catch (error) {
    next(error)
  }
})

// Create new account
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = accountSchema.validate(req.body)
    if (error) throw error

    const { accountTypeId, name, bankName, accountNumber, balance } = value

    const result = await pool.query(`
      INSERT INTO accounts (user_id, account_type_id, name, bank_name, account_number, balance)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, accountTypeId, name, bankName, accountNumber, balance])

    res.status(201).json({
      message: 'Account created successfully',
      account: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Update account
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { error, value } = accountSchema.validate(req.body)
    if (error) throw error

    const { accountTypeId, name, bankName, accountNumber } = value

    const result = await pool.query(`
      UPDATE accounts 
      SET account_type_id = $1, name = $2, bank_name = $3, account_number = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [accountTypeId, name, bankName, accountNumber, id, req.user.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' })
    }

    res.json({
      message: 'Account updated successfully',
      account: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Delete account (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if account has transactions
    const transactionCheck = await pool.query(
      'SELECT COUNT(*) FROM transactions WHERE account_id = $1',
      [id]
    )

    if (parseInt(transactionCheck.rows[0].count) > 0) {
      // Soft delete if has transactions
      const result = await pool.query(
        'UPDATE accounts SET is_active = FALSE WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, req.user.id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found' })
      }

      res.json({ message: 'Account deactivated successfully' })
    } else {
      // Hard delete if no transactions
      const result = await pool.query(
        'DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, req.user.id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found' })
      }

      res.json({ message: 'Account deleted successfully' })
    }
  } catch (error) {
    next(error)
  }
})

// Transfer between accounts
router.post('/transfer', async (req, res, next) => {
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body

    if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid from account, to account, and amount required' })
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({ error: 'Cannot transfer to the same account' })
    }

    // Verify both accounts belong to user
    const accountsResult = await pool.query(
      'SELECT id, name, balance FROM accounts WHERE id IN ($1, $2) AND user_id = $3',
      [fromAccountId, toAccountId, req.user.id]
    )

    if (accountsResult.rows.length !== 2) {
      return res.status(404).json({ error: 'One or both accounts not found' })
    }

    const fromAccount = accountsResult.rows.find(a => a.id == fromAccountId)
    const toAccount = accountsResult.rows.find(a => a.id == toAccountId)

    // Check sufficient balance
    if (fromAccount.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    // Begin transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Create outgoing transaction
      await client.query(`
        INSERT INTO transactions 
        (user_id, account_id, type, amount, description, transaction_date)
        VALUES ($1, $2, 'transfer', $3, $4, CURRENT_DATE)
      `, [req.user.id, fromAccountId, -amount, description || `Transfer to ${toAccount.name}`])

      // Create incoming transaction
      await client.query(`
        INSERT INTO transactions 
        (user_id, account_id, type, amount, description, transaction_date)
        VALUES ($1, $2, 'transfer', $3, $4, CURRENT_DATE)
      `, [req.user.id, toAccountId, amount, description || `Transfer from ${fromAccount.name}`])

      // Update account balances
      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
        [amount, fromAccountId]
      )

      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
        [amount, toAccountId]
      )

      await client.query('COMMIT')

      res.json({
        message: 'Transfer completed successfully',
        transfer: {
          from: fromAccount.name,
          to: toAccount.name,
          amount,
          description
        }
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    next(error)
  }
})

// Get account balance history
router.get('/:id/balance-history', async (req, res, next) => {
  try {
    const { id } = req.params
    const { days = 30 } = req.query

    // Verify account belongs to user
    const accountResult = await pool.query(
      'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' })
    }

    // Get balance history by calculating running totals
    const historyResult = await pool.query(`
      WITH daily_changes AS (
        SELECT 
          transaction_date::date as date,
          SUM(CASE WHEN type = 'income' OR (type = 'transfer' AND amount > 0) THEN amount ELSE 0 END) as credits,
          SUM(CASE WHEN type = 'expense' OR (type = 'transfer' AND amount < 0) THEN ABS(amount) ELSE 0 END) as debits
        FROM transactions
        WHERE account_id = $1 
          AND transaction_date >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY transaction_date::date
      ),
      date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      )
      SELECT 
        ds.date,
        COALESCE(dc.credits, 0) as credits,
        COALESCE(dc.debits, 0) as debits,
        COALESCE(dc.credits, 0) - COALESCE(dc.debits, 0) as net_change
      FROM date_series ds
      LEFT JOIN daily_changes dc ON ds.date = dc.date
      ORDER BY ds.date
    `, [id])

    // Calculate running balance
    const currentBalance = parseFloat(accountResult.rows[0].balance)
    let runningBalance = currentBalance
    
    // Work backwards from current balance
    const balanceHistory = historyResult.rows.reverse().map(day => {
      const dayBalance = runningBalance
      runningBalance -= day.net_change
      return {
        ...day,
        balance: dayBalance
      }
    }).reverse()

    res.json({
      account: accountResult.rows[0],
      balanceHistory
    })
  } catch (error) {
    next(error)
  }
})

export default router
