import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'

const router = express.Router()

// Official SARS Tax Brackets (2025/2026 & 2026/2027)
const SARS_BRACKETS = [
  { min: 0, max: 237100, base: 0, rate: 0.18 },
  { min: 237100, max: 370500, base: 42678, rate: 0.26 },
  { min: 370500, max: 512800, base: 77362, rate: 0.31 },
  { min: 512800, max: 673000, base: 121475, rate: 0.36 },
  { min: 673000, max: 857900, base: 179147, rate: 0.39 },
  { min: 857900, max: 1817000, base: 251258, rate: 0.41 },
  { min: 1817000, max: Infinity, base: 644489, rate: 0.45 },
]

const SARS_REBATES = {
  under65: 17235,
  '65to74': 17235 + 9444,
  '75plus': 17235 + 9444 + 3145,
}

function calculateSarsTax(income, ageGroup = 'under65', medicalMembers = 0) {
  if (income <= 0) {
    return { grossTax: 0, rebate: SARS_REBATES[ageGroup] || SARS_REBATES.under65, medicalCredit: 0, netTax: 0, marginalRate: 18, effectiveRate: 0 }
  }

  const bracket = SARS_BRACKETS.find(b => income > b.min && income <= b.max) || SARS_BRACKETS[0]
  const grossTax = bracket.base + (income - bracket.min) * bracket.rate
  const rebate = SARS_REBATES[ageGroup] || SARS_REBATES.under65

  // SARS Medical Scheme Fees Tax Credit (MTC): R364/m main, R364/m 1st dep, R246/m additional
  let monthlyMtc = 0
  const members = Math.max(0, parseInt(medicalMembers) || 0)
  if (members === 1) monthlyMtc = 364
  else if (members >= 2) monthlyMtc = 364 + 364 + (members - 2) * 246
  const annualMedicalCredit = monthlyMtc * 12

  const netTax = Math.max(0, grossTax - rebate - annualMedicalCredit)
  const marginalRate = Math.round(bracket.rate * 100)
  const effectiveRate = income > 0 ? Number(((netTax / income) * 100).toFixed(1)) : 0

  return {
    grossTax,
    rebate,
    medicalCredit: annualMedicalCredit,
    netTax,
    marginalRate,
    effectiveRate,
  }
}

// Validation schema
const deductionSchema = Joi.object({
  description: Joi.string().min(2).max(500).required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().required(),
  date: Joi.date().required(),
  receipt: Joi.string().max(200).optional().allow(null, ''),
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

// Calculate tax summary (supports both SARS Progressive Engine and Custom Flat Rate)
router.get('/summary/:year', async (req, res, next) => {
  try {
    const { year } = req.params
    const mode = req.query.mode || 'sars' // 'sars' | 'flat'
    const customTaxRate = parseFloat(req.query.taxRate) || 28
    const ageGroup = req.query.ageGroup || 'under65'
    const medicalMembers = parseInt(req.query.medicalMembers) || 0
    const manualIncome = req.query.manualIncome ? parseFloat(req.query.manualIncome) : null

    // Get total income from transactions
    const incomeResult = await pool.query(`
      SELECT SUM(amount) as total_income
      FROM transactions
      WHERE user_id = $1 AND type = 'income' AND EXTRACT(YEAR FROM transaction_date) = $2
    `, [req.user.id, year])

    const recordedIncome = parseFloat(incomeResult.rows[0]?.total_income) || 0
    const totalIncome = manualIncome !== null && !isNaN(manualIncome) && manualIncome > 0
      ? manualIncome
      : recordedIncome

    // Get deductions breakdown
    const deductionsResult = await pool.query(`
      SELECT category, SUM(amount) as category_total
      FROM tax_deductions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
      GROUP BY category
    `, [req.user.id, year])

    const totalDeductions = deductionsResult.rows.reduce((s, r) => s + (parseFloat(r.category_total) || 0), 0)
    const raDeductions = deductionsResult.rows
      .filter(r => r.category === 'Retirement Annuity (RA)')
      .reduce((s, r) => s + (parseFloat(r.category_total) || 0), 0)

    const taxableIncome = Math.max(0, totalIncome - totalDeductions)

    // SARS calculation before & after deductions
    const sarsBefore = calculateSarsTax(totalIncome, ageGroup, medicalMembers)
    const sarsAfter = calculateSarsTax(taxableIncome, ageGroup, medicalMembers)

    const useSars = mode === 'sars'
    const estimatedTax = useSars ? sarsAfter.netTax : (taxableIncome * customTaxRate) / 100
    const taxSavings = useSars
      ? Math.max(0, sarsBefore.netTax - sarsAfter.netTax + sarsAfter.medicalCredit)
      : (totalDeductions * customTaxRate) / 100
    const effectiveRate = useSars ? sarsAfter.effectiveRate : customTaxRate

    // Section 11F Retirement Annuity Cap: 27.5% of income, max R350,000
    const maxRaAllowed = Math.min(350000, totalIncome * 0.275)
    const raRemainingRoom = Math.max(0, maxRaAllowed - raDeductions)
    const potentialExtraRefund = (raRemainingRoom * (sarsAfter.marginalRate / 100))

    res.json({
      year,
      mode,
      totalIncome: totalIncome.toFixed(2),
      recordedIncome: recordedIncome.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      taxableIncome: taxableIncome.toFixed(2),
      taxRate: effectiveRate,
      marginalRate: sarsAfter.marginalRate,
      rebate: sarsAfter.rebate.toFixed(2),
      medicalCredit: sarsAfter.medicalCredit.toFixed(2),
      estimatedTax: estimatedTax.toFixed(2),
      taxSavings: taxSavings.toFixed(2),
      raOptimization: {
        contributed: raDeductions.toFixed(2),
        maxAllowed: maxRaAllowed.toFixed(2),
        remainingRoom: raRemainingRoom.toFixed(2),
        potentialExtraRefund: potentialExtraRefund.toFixed(2),
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router
