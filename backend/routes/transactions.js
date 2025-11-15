import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'

const router = express.Router()

// Validation schemas
const transactionSchema = Joi.object({
  categoryId: Joi.number().integer().allow(null).optional(),
  goalId: Joi.number().integer().allow(null).optional(),
  type: Joi.string().valid('income', 'expense').required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().max(500).required(),
  transactionDate: Joi.date().required(),
  tags: Joi.array().items(Joi.string()).optional()
})

// Get all transactions for user
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, categoryId, accountId, startDate, endDate } = req.query
    const offset = (page - 1) * limit

    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color,
             g.name as goal_name
      FROM transactions t
      LEFT JOIN budget_categories c ON t.category_id = c.id
      LEFT JOIN goals g ON t.goal_id = g.id
      WHERE t.user_id = $1
    `
    const params = [req.user.id]
    let paramCount = 1

    // Add filters
    if (type && type !== 'all') {
      query += ` AND t.type = $${++paramCount}`
      params.push(type)
    }
    if (categoryId && categoryId !== 'all') {
      query += ` AND t.category_id = $${++paramCount}`
      params.push(parseInt(categoryId))
    }
    if (startDate) {
      query += ` AND t.transaction_date >= $${++paramCount}`
      params.push(startDate)
    }
    if (endDate) {
      query += ` AND t.transaction_date <= $${++paramCount}`
      params.push(endDate)
    }

    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM transactions WHERE user_id = $1'
    const countParams = [req.user.id]
    const countResult = await pool.query(countQuery, countParams)

    res.json({
      transactions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    })
  } catch (error) {
    next(error)
  }
})

// Create new transaction
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = transactionSchema.validate(req.body)
    if (error) throw error

    const {
      categoryId, goalId, type, amount, description,
      transactionDate, tags
    } = value

    // Get or create default account for user
    let accountId = null
    const accountResult = await pool.query(
      'SELECT id FROM accounts WHERE user_id = $1 LIMIT 1',
      [req.user.id]
    )
    
    if (accountResult.rows.length > 0) {
      accountId = accountResult.rows[0].id
    } else {
      // Create default account if none exists
      const accountTypeResult = await pool.query(
        "SELECT id FROM account_types WHERE name = 'Checking' LIMIT 1"
      )
      const accountTypeId = accountTypeResult.rows[0]?.id || 1
      
      const newAccountResult = await pool.query(
        `INSERT INTO accounts (user_id, account_type_id, name, bank_name, balance, currency)
         VALUES ($1, $2, 'My Account', 'Default Bank', 0.00, 'ZAR')
         RETURNING id`,
        [req.user.id, accountTypeId]
      )
      accountId = newAccountResult.rows[0].id
    }

    // Create transaction
    const result = await pool.query(
      `INSERT INTO transactions 
       (user_id, account_id, category_id, goal_id, type, amount, description, 
        transaction_date, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.id, accountId, categoryId, goalId, type, amount, description,
       transactionDate, tags]
    )

    // Update goal progress if applicable
    if (goalId && type === 'expense') {
      await pool.query(
        'UPDATE goals SET current_amount = current_amount + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [amount, goalId]
      )
    }

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Update transaction
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { error, value } = transactionSchema.validate(req.body)
    if (error) throw error

    // Get original transaction for balance adjustment
    const originalResult = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    const original = originalResult.rows[0]
    const { accountId, categoryId, type, amount, description, transactionDate, location, tags } = value

    // Update transaction
    const result = await pool.query(
      `UPDATE transactions 
       SET account_id = $1, category_id = $2, type = $3, amount = $4, 
           description = $5, transaction_date = $6, location = $7, tags = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [accountId, categoryId, type, amount, description, transactionDate, location, tags, id, req.user.id]
    )

    // Adjust account balances
    const originalChange = original.type === 'income' ? original.amount : -original.amount
    const newChange = type === 'income' ? amount : -amount
    const netChange = newChange - originalChange

    await pool.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [netChange, accountId]
    )

    res.json({
      message: 'Transaction updated successfully',
      transaction: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Delete transaction
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // Get transaction for balance adjustment
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    const transaction = result.rows[0]

    // Delete transaction
    await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    // Adjust account balance (reverse the original transaction)
    const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount
    await pool.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [balanceChange, transaction.account_id]
    )

    res.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Get transaction analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const { period = '30d' } = req.query
    
    let dateFilter = ''
    switch (period) {
      case '7d':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '7 days'"
        break
      case '30d':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'"
        break
      case '90d':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '90 days'"
        break
      case '1y':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '1 year'"
        break
    }

    // Income vs Expenses
    const totalsResult = await pool.query(`
      SELECT 
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions 
      WHERE user_id = $1 ${dateFilter}
      GROUP BY type
    `, [req.user.id])

    // Spending by category
    const categoryResult = await pool.query(`
      SELECT 
        c.name,
        c.color,
        SUM(t.amount) as total,
        COUNT(t.*) as count
      FROM transactions t
      JOIN budget_categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.type = 'expense' ${dateFilter}
      GROUP BY c.id, c.name, c.color
      ORDER BY total DESC
    `, [req.user.id])

    // Daily spending trend
    const trendResult = await pool.query(`
      SELECT 
        transaction_date::date as date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM transactions 
      WHERE user_id = $1 ${dateFilter}
      GROUP BY transaction_date::date
      ORDER BY date
    `, [req.user.id])

    res.json({
      totals: totalsResult.rows,
      categories: categoryResult.rows,
      trend: trendResult.rows
    })
  } catch (error) {
    next(error)
  }
})

export default router
