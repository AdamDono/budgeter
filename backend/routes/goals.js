import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'

const router = express.Router()

// Validation schemas
const goalSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).allow(null).optional(),
  targetAmount: Joi.number().positive().required(),
  targetDate: Joi.date().allow(null).optional(),
  priority: Joi.number().integer().min(1).max(3).default(2)
})

// Get all goals for user
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        g.*,
        CASE 
          WHEN g.target_amount > 0 THEN ROUND((g.current_amount / g.target_amount * 100), 2)
          ELSE 0
        END as progress_percentage,
        CASE 
          WHEN g.target_date IS NOT NULL THEN 
            (g.target_date::date - CURRENT_DATE)::integer
          ELSE NULL 
        END as days_remaining
      FROM goals g
      WHERE g.user_id = $1
      ORDER BY g.priority ASC, g.created_at DESC
    `, [req.user.id])

    res.json({ goals: result.rows })
  } catch (error) {
    next(error)
  }
})

// Create new goal
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = goalSchema.validate(req.body)
    if (error) throw error

    const { name, description, targetAmount, targetDate, priority } = value

    const result = await pool.query(`
      INSERT INTO goals (user_id, name, description, target_amount, target_date, priority)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, name, description, targetAmount, targetDate, priority])

    res.status(201).json({
      message: 'Goal created successfully',
      goal: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Update goal
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { error, value } = goalSchema.validate(req.body)
    if (error) throw error

    const { name, description, targetAmount, targetDate, priority } = value

    const result = await pool.query(`
      UPDATE goals 
      SET name = $1, description = $2, target_amount = $3, target_date = $4, 
          priority = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [name, description, targetAmount, targetDate, priority, id, req.user.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    res.json({
      message: 'Goal updated successfully',
      goal: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Add contribution to goal
router.post('/:id/contribute', async (req, res, next) => {
  try {
    const { id } = req.params
    const { amount, accountId, description } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' })
    }

    // Verify goal exists and belongs to user
    const goalResult = await pool.query(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (goalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    const goal = goalResult.rows[0]

    // Create transaction for the contribution
    await pool.query(`
      INSERT INTO transactions 
      (user_id, account_id, goal_id, category_id, type, amount, description, transaction_date)
      VALUES ($1, $2, $3, 15, 'expense', $4, $5, CURRENT_DATE)
    `, [req.user.id, accountId, id, amount, description || `Contribution to ${goal.name}`])

    // Update goal progress
    const updatedGoal = await pool.query(`
      UPDATE goals 
      SET current_amount = current_amount + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [amount, id, req.user.id])

    // Check if goal is achieved
    const newGoal = updatedGoal.rows[0]
    if (newGoal.current_amount >= newGoal.target_amount && !newGoal.is_achieved) {
      await pool.query(
        'UPDATE goals SET is_achieved = TRUE WHERE id = $1',
        [id]
      )

      // Create achievement notification
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, 'Goal Achieved! 🎉', $2, 'goal_achieved')
      `, [req.user.id, `Congratulations! You've reached your goal: ${newGoal.name}`])
    }

    res.json({
      message: 'Contribution added successfully',
      goal: newGoal
    })
  } catch (error) {
    next(error)
  }
})

// Delete goal
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    res.json({ message: 'Goal deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Get goal progress analytics
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const { id } = req.params

    // Get goal details
    const goalResult = await pool.query(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (goalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    const goal = goalResult.rows[0]

    // Get contribution history
    const contributionsResult = await pool.query(`
      SELECT 
        transaction_date::date as date,
        amount,
        description
      FROM transactions
      WHERE goal_id = $1 AND user_id = $2 AND type = 'expense'
      ORDER BY transaction_date DESC
    `, [id, req.user.id])

    // Calculate monthly progress
    const monthlyResult = await pool.query(`
      SELECT 
        DATE_TRUNC('month', transaction_date) as month,
        SUM(amount) as total_contributed
      FROM transactions
      WHERE goal_id = $1 AND user_id = $2 AND type = 'expense'
      GROUP BY DATE_TRUNC('month', transaction_date)
      ORDER BY month
    `, [id, req.user.id])

    // Calculate projected completion
    let projectedCompletion = null
    if (goal.target_date && contributionsResult.rows.length > 0) {
      const totalContributed = contributionsResult.rows.reduce((sum, t) => sum + parseFloat(t.amount), 0)
      const remaining = goal.target_amount - totalContributed
      const avgMonthly = monthlyResult.rows.length > 0 
        ? monthlyResult.rows.reduce((sum, m) => sum + parseFloat(m.total_contributed), 0) / monthlyResult.rows.length
        : 0
      
      if (avgMonthly > 0) {
        const monthsToComplete = Math.ceil(remaining / avgMonthly)
        projectedCompletion = new Date()
        projectedCompletion.setMonth(projectedCompletion.getMonth() + monthsToComplete)
      }
    }

    res.json({
      goal,
      contributions: contributionsResult.rows,
      monthlyProgress: monthlyResult.rows,
      projectedCompletion,
      analytics: {
        totalContributed: goal.current_amount,
        remaining: goal.target_amount - goal.current_amount,
        progressPercentage: Math.round((goal.current_amount / goal.target_amount) * 100),
        averageMonthly: monthlyResult.rows.length > 0 
          ? monthlyResult.rows.reduce((sum, m) => sum + parseFloat(m.total_contributed), 0) / monthlyResult.rows.length
          : 0
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router
