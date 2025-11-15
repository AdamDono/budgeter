import express from 'express'
import Joi from 'joi'
import cron from 'node-cron'
import { pool } from '../database/connection.js'

const router = express.Router()

// Validation schemas
const recurringSchema = Joi.object({
  accountId: Joi.number().integer().required(),
  categoryId: Joi.number().integer().optional(),
  type: Joi.string().valid('income', 'expense').required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().min(2).max(500).required(),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().optional(),
  autoCreate: Joi.boolean().default(false)
})

// Get all recurring transactions for user
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        c.name as category_name,
        c.color as category_color,
        a.name as account_name
      FROM recurring_transactions r
      LEFT JOIN budget_categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.user_id = $1
      ORDER BY r.next_due_date ASC
    `, [req.user.id])

    res.json({ recurringTransactions: result.rows })
  } catch (error) {
    next(error)
  }
})

// Create new recurring transaction
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = recurringSchema.validate(req.body)
    if (error) throw error

    const {
      accountId, categoryId, type, amount, description,
      frequency, startDate, endDate, autoCreate
    } = value

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(startDate, frequency)

    const result = await pool.query(`
      INSERT INTO recurring_transactions 
      (user_id, account_id, category_id, type, amount, description, 
       frequency, start_date, end_date, next_due_date, auto_create)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [req.user.id, accountId, categoryId, type, amount, description,
        frequency, startDate, endDate, nextDueDate, autoCreate])

    res.status(201).json({
      message: 'Recurring transaction created successfully',
      recurringTransaction: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Update recurring transaction
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { error, value } = recurringSchema.validate(req.body)
    if (error) throw error

    const {
      accountId, categoryId, type, amount, description,
      frequency, startDate, endDate, autoCreate
    } = value

    // Recalculate next due date
    const nextDueDate = calculateNextDueDate(startDate, frequency)

    const result = await pool.query(`
      UPDATE recurring_transactions 
      SET account_id = $1, category_id = $2, type = $3, amount = $4, 
          description = $5, frequency = $6, start_date = $7, end_date = $8,
          next_due_date = $9, auto_create = $10
      WHERE id = $11 AND user_id = $12
      RETURNING *
    `, [accountId, categoryId, type, amount, description, frequency,
        startDate, endDate, nextDueDate, autoCreate, id, req.user.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring transaction not found' })
    }

    res.json({
      message: 'Recurring transaction updated successfully',
      recurringTransaction: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Delete recurring transaction
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring transaction not found' })
    }

    res.json({ message: 'Recurring transaction deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Execute recurring transaction (create actual transaction)
router.post('/:id/execute', async (req, res, next) => {
  try {
    const { id } = req.params

    // Get recurring transaction
    const recurringResult = await pool.query(
      'SELECT * FROM recurring_transactions WHERE id = $1 AND user_id = $2 AND is_active = TRUE',
      [id, req.user.id]
    )

    if (recurringResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring transaction not found' })
    }

    const recurring = recurringResult.rows[0]

    // Create the actual transaction
    const transactionResult = await pool.query(`
      INSERT INTO transactions 
      (user_id, account_id, category_id, type, amount, description, 
       transaction_date, is_recurring, recurring_id)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, TRUE, $7)
      RETURNING *
    `, [req.user.id, recurring.account_id, recurring.category_id, 
        recurring.type, recurring.amount, recurring.description, recurring.id])

    // Update account balance
    const balanceChange = recurring.type === 'income' ? recurring.amount : -recurring.amount
    await pool.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [balanceChange, recurring.account_id]
    )

    // Update next due date
    const nextDueDate = calculateNextDueDate(recurring.next_due_date, recurring.frequency)
    await pool.query(
      'UPDATE recurring_transactions SET next_due_date = $1 WHERE id = $2',
      [nextDueDate, recurring.id]
    )

    // Check if recurring transaction should be deactivated (past end date)
    if (recurring.end_date && new Date(nextDueDate) > new Date(recurring.end_date)) {
      await pool.query(
        'UPDATE recurring_transactions SET is_active = FALSE WHERE id = $1',
        [recurring.id]
      )
    }

    res.json({
      message: 'Recurring transaction executed successfully',
      transaction: transactionResult.rows[0],
      nextDueDate
    })
  } catch (error) {
    next(error)
  }
})

// Get upcoming recurring transactions (due in next 7 days)
router.get('/upcoming', async (req, res, next) => {
  try {
    const { days = 7 } = req.query

    const result = await pool.query(`
      SELECT 
        r.*,
        c.name as category_name,
        c.color as category_color,
        a.name as account_name,
        EXTRACT(days FROM r.next_due_date - CURRENT_DATE) as days_until_due
      FROM recurring_transactions r
      LEFT JOIN budget_categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.user_id = $1 
        AND r.is_active = TRUE
        AND r.next_due_date <= CURRENT_DATE + INTERVAL '${days} days'
        AND r.next_due_date >= CURRENT_DATE
      ORDER BY r.next_due_date ASC
    `, [req.user.id])

    res.json({ upcomingTransactions: result.rows })
  } catch (error) {
    next(error)
  }
})

// Get overdue recurring transactions
router.get('/overdue', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        c.name as category_name,
        c.color as category_color,
        a.name as account_name,
        EXTRACT(days FROM CURRENT_DATE - r.next_due_date) as days_overdue
      FROM recurring_transactions r
      LEFT JOIN budget_categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.user_id = $1 
        AND r.is_active = TRUE
        AND r.next_due_date < CURRENT_DATE
      ORDER BY r.next_due_date ASC
    `, [req.user.id])

    res.json({ overdueTransactions: result.rows })
  } catch (error) {
    next(error)
  }
})

// Helper function to calculate next due date
function calculateNextDueDate(currentDate, frequency) {
  const date = new Date(currentDate)
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      throw new Error('Invalid frequency')
  }
  
  return date
}

// Cron job to auto-create recurring transactions (runs daily at 6 AM)
cron.schedule('0 6 * * *', async () => {
  try {
    console.log('Running recurring transactions cron job...')
    
    // Get all due recurring transactions with auto_create enabled
    const result = await pool.query(`
      SELECT * FROM recurring_transactions 
      WHERE is_active = TRUE 
        AND auto_create = TRUE 
        AND next_due_date <= CURRENT_DATE
    `)

    for (const recurring of result.rows) {
      try {
        // Create the transaction
        await pool.query(`
          INSERT INTO transactions 
          (user_id, account_id, category_id, type, amount, description, 
           transaction_date, is_recurring, recurring_id)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, TRUE, $7)
        `, [recurring.user_id, recurring.account_id, recurring.category_id, 
            recurring.type, recurring.amount, recurring.description, recurring.id])

        // Update account balance
        const balanceChange = recurring.type === 'income' ? recurring.amount : -recurring.amount
        await pool.query(
          'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
          [balanceChange, recurring.account_id]
        )

        // Update next due date
        const nextDueDate = calculateNextDueDate(recurring.next_due_date, recurring.frequency)
        await pool.query(
          'UPDATE recurring_transactions SET next_due_date = $1 WHERE id = $2',
          [nextDueDate, recurring.id]
        )

        // Create notification
        await pool.query(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES ($1, 'Recurring Transaction Created', $2, 'recurring_executed')
        `, [recurring.user_id, `${recurring.description} - ${recurring.amount} ZAR`])

        console.log(`Created recurring transaction: ${recurring.description} for user ${recurring.user_id}`)
      } catch (error) {
        console.error(`Error creating recurring transaction ${recurring.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Error in recurring transactions cron job:', error)
  }
})

export default router
