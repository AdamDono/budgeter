import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'

const router = express.Router()

// Validation schemas
const budgetCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  icon: Joi.string().max(50).allow(null).optional(),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).allow(null).optional(),
  monthlyLimit: Joi.number().positive().allow(null).optional()
})

// Get all budget categories for user
router.get('/categories', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COALESCE(SUM(CASE 
          WHEN t.type = 'expense' 
            AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
          THEN t.amount 
          ELSE 0 
        END), 0) as current_month_spent,
        CASE 
          WHEN c.monthly_limit IS NOT NULL AND c.monthly_limit > 0 THEN
            ROUND((COALESCE(SUM(CASE 
              WHEN t.type = 'expense' 
                AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
              THEN t.amount 
              ELSE 0 
            END), 0) / c.monthly_limit * 100), 2)
          ELSE 0
        END as percentage_used
      FROM budget_categories c
      LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = $1
      WHERE c.user_id = $1 OR c.user_id IS NULL
      GROUP BY c.id, c.name, c.icon, c.color, c.monthly_limit, c.is_active, c.created_at
      ORDER BY c.created_at DESC
    `, [req.user.id])

    res.json({ categories: result.rows })
  } catch (error) {
    next(error)
  }
})

// Create new budget category
router.post('/categories', async (req, res, next) => {
  try {
    const { error, value } = budgetCategorySchema.validate(req.body)
    if (error) throw error

    const { name, icon, color, monthlyLimit } = value

    const result = await pool.query(`
      INSERT INTO budget_categories (user_id, name, icon, color, monthly_limit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, name, icon, color, monthlyLimit])

    res.status(201).json({
      message: 'Budget category created successfully',
      category: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Update budget category
router.put('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { error, value } = budgetCategorySchema.validate(req.body)
    if (error) throw error

    const { name, icon, color, monthlyLimit } = value

    const result = await pool.query(`
      UPDATE budget_categories 
      SET name = $1, icon = $2, color = $3, monthly_limit = $4
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [name, icon, color, monthlyLimit, id, req.user.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget category not found' })
    }

    res.json({
      message: 'Budget category updated successfully',
      category: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Delete budget category
router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if category has transactions
    const transactionCheck = await pool.query(
      'SELECT COUNT(*) FROM transactions WHERE category_id = $1',
      [id]
    )

    if (parseInt(transactionCheck.rows[0].count) > 0) {
      // Soft delete if has transactions
      const result = await pool.query(
        'UPDATE budget_categories SET is_active = FALSE WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, req.user.id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Budget category not found' })
      }

      res.json({ message: 'Budget category deactivated successfully' })
    } else {
      // Hard delete if no transactions
      const result = await pool.query(
        'DELETE FROM budget_categories WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, req.user.id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Budget category not found' })
      }

      res.json({ message: 'Budget category deleted successfully' })
    }
  } catch (error) {
    next(error)
  }
})

// Get budget performance report
router.get('/performance', async (req, res, next) => {
  try {
    const { month, year } = req.query
    const targetMonth = month || new Date().getMonth() + 1
    const targetYear = year || new Date().getFullYear()

    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.color,
        c.monthly_limit,
        COALESCE(SUM(t.amount), 0) as actual_spent,
        CASE 
          WHEN c.monthly_limit IS NOT NULL AND c.monthly_limit > 0 THEN
            c.monthly_limit - COALESCE(SUM(t.amount), 0)
          ELSE NULL
        END as remaining,
        CASE 
          WHEN c.monthly_limit IS NOT NULL AND c.monthly_limit > 0 THEN
            ROUND((COALESCE(SUM(t.amount), 0) / c.monthly_limit * 100), 2)
          ELSE 0
        END as percentage_used,
        COUNT(t.id) as transaction_count
      FROM budget_categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.user_id = $1 
        AND t.type = 'expense'
        AND EXTRACT(month FROM t.transaction_date) = $2
        AND EXTRACT(year FROM t.transaction_date) = $3
      WHERE c.user_id = $1 AND c.is_active = TRUE
      GROUP BY c.id, c.name, c.color, c.monthly_limit
      ORDER BY percentage_used DESC
    `, [req.user.id, targetMonth, targetYear])

    // Calculate overall budget performance
    const totalBudget = result.rows.reduce((sum, cat) => sum + (cat.monthly_limit || 0), 0)
    const totalSpent = result.rows.reduce((sum, cat) => sum + parseFloat(cat.actual_spent), 0)
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget * 100).toFixed(2) : 0

    // Identify problem areas
    const overBudgetCategories = result.rows.filter(cat => cat.percentage_used > 100)
    const nearLimitCategories = result.rows.filter(cat => 
      cat.percentage_used >= 80 && cat.percentage_used <= 100
    )

    res.json({
      month: targetMonth,
      year: targetYear,
      categories: result.rows,
      summary: {
        totalBudget,
        totalSpent,
        totalRemaining: totalBudget - totalSpent,
        overallPercentage: parseFloat(overallPercentage),
        categoriesOverBudget: overBudgetCategories.length,
        categoriesNearLimit: nearLimitCategories.length
      },
      alerts: {
        overBudget: overBudgetCategories,
        nearLimit: nearLimitCategories
      }
    })
  } catch (error) {
    next(error)
  }
})

// Get spending trends by category
router.get('/trends', async (req, res, next) => {
  try {
    const { categoryId, months = 6 } = req.query

    let query = `
      SELECT 
        DATE_TRUNC('month', t.transaction_date) as month,
        c.name as category_name,
        c.color,
        SUM(t.amount) as total_spent,
        COUNT(t.id) as transaction_count,
        AVG(t.amount) as average_transaction
      FROM transactions t
      JOIN budget_categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND t.type = 'expense'
        AND t.transaction_date >= CURRENT_DATE - INTERVAL '${months} months'
    `
    
    const params = [req.user.id]
    
    if (categoryId) {
      query += ` AND c.id = $2`
      params.push(categoryId)
    }
    
    query += `
      GROUP BY DATE_TRUNC('month', t.transaction_date), c.id, c.name, c.color
      ORDER BY month DESC, total_spent DESC
    `

    const result = await pool.query(query, params)

    // Group by month for easier frontend consumption
    const trendsByMonth = {}
    result.rows.forEach(row => {
      const monthKey = row.month.toISOString().slice(0, 7) // YYYY-MM format
      if (!trendsByMonth[monthKey]) {
        trendsByMonth[monthKey] = []
      }
      trendsByMonth[monthKey].push({
        categoryName: row.category_name,
        color: row.color,
        totalSpent: parseFloat(row.total_spent),
        transactionCount: parseInt(row.transaction_count),
        averageTransaction: parseFloat(row.average_transaction)
      })
    })

    res.json({
      months: parseInt(months),
      categoryId: categoryId || null,
      trends: trendsByMonth
    })
  } catch (error) {
    next(error)
  }
})

export default router
