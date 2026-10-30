import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'

const router = express.Router()

// Validation schema
const debtSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  balance: Joi.number().min(0).required(),
  interestRate: Joi.number().min(0).max(100).required(),
  monthlyPayment: Joi.number().min(0).required(),
  type: Joi.string().valid(
    'credit-card',
    'personal-loan',
    'student-loan',
    'mortgage',
    'vehicle-finance',
    'store-card',
    'bnpl',
    'other'
  ).required(),
  creditLimit: Joi.number().min(0).optional().allow(null, 0),
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

    const { name, balance, interestRate, monthlyPayment, type, creditLimit } = value

    const result = await pool.query(`
      INSERT INTO debts (user_id, name, balance, interest_rate, monthly_payment, type, credit_limit)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, name, balance, interestRate, monthlyPayment, type, creditLimit || 0])

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

    const { name, balance, interestRate, monthlyPayment, type, creditLimit } = value

    const result = await pool.query(`
      UPDATE debts
      SET name = $1, balance = $2, interest_rate = $3, monthly_payment = $4, type = $5, credit_limit = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `, [name, balance, interestRate, monthlyPayment, type, creditLimit || 0, id, req.user.id])

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

// Record a payment towards a specific debt (creates linked transaction + reduces debt balance)
router.post('/:id/pay', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    const { amount, description } = req.body
    const payAmount = parseFloat(amount)

    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' })
    }

    const debtRes = await client.query(
      'SELECT * FROM debts WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )
    if (debtRes.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' })
    }
    const debt = debtRes.rows[0]

    await client.query('BEGIN')

    // Get default account and 'Debt Repayment' category
    const accRes = await client.query('SELECT id FROM accounts WHERE user_id = $1 LIMIT 1', [req.user.id])
    const accountId = accRes.rows[0]?.id || null

    const catRes = await client.query(
      "SELECT id FROM budget_categories WHERE (user_id = $1 OR user_id IS NULL) AND name = 'Debt Repayment' LIMIT 1",
      [req.user.id]
    )
    const categoryId = catRes.rows[0]?.id || null

    // Update debt balance
    const updatedDebt = await client.query(
      'UPDATE debts SET balance = GREATEST(0, balance - $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [payAmount, id, req.user.id]
    )

    // Log transaction
    await client.query(
      `INSERT INTO transactions (user_id, account_id, category_id, debt_id, type, amount, description, transaction_date)
       VALUES ($1, $2, $3, $4, 'expense', $5, $6, CURRENT_DATE)`,
      [req.user.id, accountId, categoryId, debt.id, payAmount, description || `Debt Payment: ${debt.name}`]
    )

    // Update account balance
    if (accountId) {
      await client.query(
        'UPDATE accounts SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [payAmount, accountId]
      )
    }

    await client.query('COMMIT')
    res.json({
      message: `R${payAmount.toFixed(2)} paid towards ${debt.name}!`,
      debt: updatedDebt.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
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

// Helper to run multi-debt rollover payoff simulation
function simulateRolloverPlan(debtsRows, strategy = 'snowball', extraPayment = 0, rateDelta = 0) {
  const ordered = [...debtsRows].sort((a, b) => {
    if (strategy === 'snowball') {
      return parseFloat(a.balance) - parseFloat(b.balance)
    }
    return parseFloat(b.interest_rate) - parseFloat(a.interest_rate)
  })

  const state = ordered.map(d => ({
    ...d,
    simBalance: Math.max(0, parseFloat(d.balance) || 0),
    simRate: Math.max(0, (parseFloat(d.interest_rate) || 0) + parseFloat(rateDelta || 0)),
    minPayment: Math.max(10, parseFloat(d.monthly_payment) || 0),
    payoffMonths: 0,
    simInterest: 0,
  }))

  const totalMinBudget = state.reduce((sum, d) => sum + (d.simBalance > 0 ? d.minPayment : 0), 0)
  const monthlyBudget = totalMinBudget + Math.max(0, parseFloat(extraPayment) || 0)

  let month = 0
  while (month < 600) {
    const active = state.filter(d => d.simBalance > 0.01)
    if (active.length === 0) break
    month++

    let availablePool = monthlyBudget

    // 1. Accrue monthly interest and apply minimum payments
    for (const d of active) {
      const monthlyInterest = (d.simBalance * d.simRate) / 100 / 12
      d.simBalance += monthlyInterest
      d.simInterest += monthlyInterest

      const minPay = Math.min(d.simBalance, d.minPayment)
      d.simBalance -= minPay
      availablePool -= minPay

      if (d.simBalance <= 0.01) {
        d.simBalance = 0
        if (d.payoffMonths === 0) d.payoffMonths = month
      }
    }

    // 2. Roll over remaining pool (from paid-off debts + extraPayment) to priority target
    for (const d of active) {
      if (availablePool <= 0.01) break
      if (d.simBalance > 0.01) {
        const extra = Math.min(d.simBalance, availablePool)
        d.simBalance -= extra
        availablePool -= extra
        if (d.simBalance <= 0.01) {
          d.simBalance = 0
          if (d.payoffMonths === 0) d.payoffMonths = month
        }
      }
    }
  }

  const plan = state.map(d => ({
    ...d,
    payoffMonths: d.payoffMonths || (parseFloat(d.balance) > 0 ? month : 0),
    totalInterest: d.simInterest.toFixed(2),
  }))

  const totalInterest = state.reduce((s, d) => s + d.simInterest, 0)
  const totalDebt = debtsRows.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)

  return {
    strategy,
    plan,
    months: month,
    totalInterest: totalInterest.toFixed(2),
    totalDebt: totalDebt.toFixed(2),
  }
}

// Calculate payoff plan
router.post('/calculate/payoff', async (req, res, next) => {
  try {
    const { strategy = 'snowball', extraPayment = 0, rateDelta = 0 } = req.body

    const result = await pool.query(`
      SELECT * FROM debts
      WHERE user_id = $1
    `, [req.user.id])

    const debts = result.rows
    const activeSimulation = simulateRolloverPlan(debts, strategy, extraPayment, rateDelta)
    const baselineSimulation = simulateRolloverPlan(debts, strategy, 0, 0)

    res.json({
      ...activeSimulation,
      baselineMonths: baselineSimulation.months,
      baselineInterest: baselineSimulation.totalInterest,
      monthsSaved: Math.max(0, baselineSimulation.months - activeSimulation.months),
      interestSaved: Math.max(0, parseFloat(baselineSimulation.totalInterest) - parseFloat(activeSimulation.totalInterest)).toFixed(2),
    })
  } catch (error) {
    next(error)
  }
})

export default router
