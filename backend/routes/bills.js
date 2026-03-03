import express from 'express'
import { pool } from '../database/connection.js'

const router = express.Router()

// GET all bill reminders for user
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        (b.due_date - CURRENT_DATE) as days_until_due
      FROM bill_reminders b
      LEFT JOIN budget_categories c ON b.category_id = c.id
      WHERE b.user_id = $1
      ORDER BY b.due_date ASC
    `, [req.user.id])

    // Group into upcoming, due soon, overdue
    const bills = result.rows.map(b => ({
      ...b,
      days_until_due: parseInt(b.days_until_due),
      status: parseInt(b.days_until_due) < 0
        ? 'overdue'
        : parseInt(b.days_until_due) <= (b.reminder_days || 3)
        ? 'due_soon'
        : 'upcoming'
    }))

    res.json({ bills })
  } catch (error) {
    next(error)
  }
})

// GET upcoming bills (next N days)
router.get('/upcoming', async (req, res, next) => {
  try {
    const { days = 7 } = req.query
    const result = await pool.query(`
      SELECT 
        b.*,
        c.name as category_name,
        c.color as category_color,
        (b.due_date - CURRENT_DATE) as days_until_due
      FROM bill_reminders b
      LEFT JOIN budget_categories c ON b.category_id = c.id
      WHERE b.user_id = $1
        AND b.is_paid = FALSE
        AND b.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $2::INTEGER * INTERVAL '1 day'
      ORDER BY b.due_date ASC
    `, [req.user.id, days])

    res.json({ bills: result.rows })
  } catch (error) {
    next(error)
  }
})

// CREATE a bill reminder
router.post('/', async (req, res, next) => {
  try {
    const { name, amount, due_date, frequency, category_id, reminder_days = 3 } = req.body

    if (!name || !due_date) {
      return res.status(400).json({ error: 'Name and due date are required' })
    }

    const result = await pool.query(`
      INSERT INTO bill_reminders (user_id, name, amount, due_date, frequency, category_id, reminder_days)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, name, amount || null, due_date, frequency || null, category_id || null, reminder_days])

    res.status(201).json({ bill: result.rows[0] })
  } catch (error) {
    next(error)
  }
})

// UPDATE a bill reminder
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, amount, due_date, frequency, category_id, is_paid, reminder_days } = req.body

    const result = await pool.query(`
      UPDATE bill_reminders
      SET
        name = COALESCE($1, name),
        amount = COALESCE($2, amount),
        due_date = COALESCE($3, due_date),
        frequency = COALESCE($4, frequency),
        category_id = COALESCE($5, category_id),
        is_paid = COALESCE($6, is_paid),
        reminder_days = COALESCE($7, reminder_days)
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `, [name, amount, due_date, frequency, category_id, is_paid, reminder_days, id, req.user.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill reminder not found' })
    }

    res.json({ bill: result.rows[0] })
  } catch (error) {
    next(error)
  }
})

// MARK a bill as paid
router.post('/:id/pay', async (req, res, next) => {
  try {
    const { id } = req.params

    // If recurring, set next due date; otherwise just mark paid
    const billResult = await pool.query(
      'SELECT * FROM bill_reminders WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (billResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    const bill = billResult.rows[0]
    let nextDueDate = null

    if (bill.frequency) {
      const current = new Date(bill.due_date)
      switch (bill.frequency) {
        case 'monthly':   current.setMonth(current.getMonth() + 1); break
        case 'quarterly': current.setMonth(current.getMonth() + 3); break
        case 'yearly':    current.setFullYear(current.getFullYear() + 1); break
      }
      nextDueDate = current.toISOString().split('T')[0]
    }

    const updateQuery = nextDueDate
      ? `UPDATE bill_reminders SET is_paid = FALSE, due_date = $1 WHERE id = $2 AND user_id = $3 RETURNING *`
      : `UPDATE bill_reminders SET is_paid = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`

    const updateParams = nextDueDate
      ? [nextDueDate, id, req.user.id]
      : [id, req.user.id]

    const result = await pool.query(updateQuery, updateParams)
    res.json({ bill: result.rows[0], message: nextDueDate ? `Next due: ${nextDueDate}` : 'Bill marked as paid' })
  } catch (error) {
    next(error)
  }
})

// DELETE a bill reminder
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'DELETE FROM bill_reminders WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill reminder not found' })
    }

    res.json({ message: 'Bill deleted successfully' })
  } catch (error) {
    next(error)
  }
})

export default router
