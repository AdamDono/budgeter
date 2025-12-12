import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'

const router = express.Router()

// Validation schema
const deductionSchema = Joi.object({
  description: Joi.string().min(2).max(500).required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().required(),
  date: Joi.date().required(),
  receipt: Joi.string().max(200).optional(),
})

// Get all tax deductions for user
router.get('/', async (req, res, next) => {
  try {
    const { year } = req.query
    const currentYear = year || new Date().getFullYear()

    const result = await pool.query(`
      SELECT * FROM tax_deductions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
      ORDER BY date DESC
    `, [req.user.id, currentYear])

    // Group by category
    const byCategory = result.rows.reduce((acc, d) => {
      if (!acc[d.category]) acc[d.category] = []
      acc[d.category].push(d)
      return acc
    }, {})

    const totalDeductions = result.rows.reduce((sum, d) => sum + parseFloat(d.amount), 0)

    res.json({
      deductions: result.rows,
      byCategory,
      totalDeductions: totalDeductions.toFixed(2),
      year: currentYear
    })
  } catch (error) {
    next(error)
  }
})

// Create new deduction
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = deductionSchema.validate(req.body)
    if (error) throw error

    const { description, amount, category, date, receipt } = value

    const result = await pool.query(`
      INSERT INTO tax_deductions (user_id, description, amount, category, date, receipt)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, description, amount, category, date, receipt || null])

    res.status(201).json({
      message: 'Deduction created successfully',
      deduction: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Update deduction
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { error, value } = deductionSchema.validate(req.body)
    if (error) throw error

    const { description, amount, category, date, receipt } = value

    const result = await pool.query(`
      UPDATE tax_deductions
      SET description = $1, amount = $2, category = $3, date = $4, receipt = $5
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [description, amount, category, date, receipt || null, id, req.user.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deduction not found' })
    }

    res.json({
      message: 'Deduction updated successfully',
      deduction: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Delete deduction
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM tax_deductions WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deduction not found' })
    }

    res.json({ message: 'Deduction deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Calculate tax summary
router.get('/summary/:year', async (req, res, next) => {
  try {
    const { year } = req.params
    const taxRate = req.query.taxRate || 28

    // Get total income from transactions
    const incomeResult = await pool.query(`
      SELECT SUM(amount) as total_income
      FROM transactions
      WHERE user_id = $1 AND type = 'income' AND EXTRACT(YEAR FROM transaction_date) = $2
    `, [req.user.id, year])

    const totalIncome = parseFloat(incomeResult.rows[0]?.total_income) || 0

    // Get total deductions
    const deductionsResult = await pool.query(`
      SELECT SUM(amount) as total_deductions
      FROM tax_deductions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
    `, [req.user.id, year])

    const totalDeductions = parseFloat(deductionsResult.rows[0]?.total_deductions) || 0

    const taxableIncome = Math.max(0, totalIncome - totalDeductions)
    const estimatedTax = (taxableIncome * taxRate) / 100
    const taxSavings = (totalDeductions * taxRate) / 100

    res.json({
      year,
      totalIncome: totalIncome.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      taxableIncome: taxableIncome.toFixed(2),
      taxRate,
      estimatedTax: estimatedTax.toFixed(2),
      taxSavings: taxSavings.toFixed(2),
    })
  } catch (error) {
    next(error)
  }
})

export default router
