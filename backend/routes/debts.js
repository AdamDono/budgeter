import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'

const router = express.Router()

// Validation schema
const debtSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  balance: Joi.number().positive().required(),
  interestRate: Joi.number().min(0).max(100).required(),
  monthlyPayment: Joi.number().positive().required(),
  type: Joi.string().valid('credit-card', 'personal-loan', 'student-loan', 'mortgage', 'other').required(),
})

// Get all debts for user
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT * FROM debts
      WHERE user_id = $1
      ORDER BY balance DESC
    `, [req.user.id])

    res.json({ debts: result.rows })
  } catch (error) {
    next(error)
  }
})

// Create new debt
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = debtSchema.validate(req.body)
    if (error) throw error

    const { name, balance, interestRate, monthlyPayment, type } = value

    const result = await pool.query(`
      INSERT INTO debts (user_id, name, balance, interest_rate, monthly_payment, type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, name, balance, interestRate, monthlyPayment, type])

    res.status(201).json({
      message: 'Debt created successfully',
      debt: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Update debt
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { error, value } = debtSchema.validate(req.body)
    if (error) throw error

    const { name, balance, interestRate, monthlyPayment, type } = value

    const result = await pool.query(`
      UPDATE debts
      SET name = $1, balance = $2, interest_rate = $3, monthly_payment = $4, type = $5
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [name, balance, interestRate, monthlyPayment, type, id, req.user.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' })
    }

    res.json({
      message: 'Debt updated successfully',
      debt: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Delete debt
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM debts WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' })
    }

    res.json({ message: 'Debt deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Calculate payoff plan
router.post('/calculate/payoff', async (req, res, next) => {
  try {
    const { strategy = 'snowball' } = req.body

    const result = await pool.query(`
      SELECT * FROM debts
      WHERE user_id = $1
      ORDER BY ${strategy === 'snowball' ? 'balance' : 'interest_rate DESC'}
    `, [req.user.id])

    const debts = result.rows
    let totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.balance), 0)
    let totalInterest = 0
    let months = 0
    const plan = []

    debts.forEach(debt => {
      const monthlyPayment = parseFloat(debt.monthly_payment)
      let balance = parseFloat(debt.balance)
      let debtMonths = 0
      let debtInterest = 0

      if (balance > 0) {
        while (balance > 0) {
          const interest = (balance * parseFloat(debt.interest_rate)) / 100 / 12
          
          // If interest is more than payment, it will never be paid off
          if (interest >= monthlyPayment && balance > 0) {
            debtMonths = 999 // Represent "Never" or very long
            break
          }
          
          balance -= (monthlyPayment - interest)
          debtInterest += interest
          debtMonths++
          
          if (debtMonths > 1200) break // 100 years limit
        }
      }

      plan.push({
        ...debt,
        payoffMonths: debtMonths,
        totalInterest: debtInterest.toFixed(2),
      })

      months = Math.max(months, debtMonths)
      totalInterest += debtInterest
    })

    res.json({
      strategy,
      plan,
      months,
      totalInterest: totalInterest.toFixed(2),
      totalDebt: totalDebt.toFixed(2),
    })
  } catch (error) {
    next(error)
  }
})

export default router
