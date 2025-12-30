
import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'

const router = express.Router()

// Validation schema
const savingsSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  balance: Joi.number().min(0).optional(),
  targetAmount: Joi.number().positive().allow(null).optional(),
  interestRate: Joi.number().min(0).max(100).optional(),
  color: Joi.string().max(7).optional(),
  icon: Joi.string().max(50).optional()
})

// Get all savings for user
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT * FROM savings
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id])

    res.json({ savings: result.rows })
  } catch (error) {
    next(error)
  }
})

// Create new saving pot
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = savingsSchema.validate(req.body)
    if (error) throw error

    const { name, balance = 0, targetAmount = null, interestRate = 0, color = '#10B981', icon = 'piggy-bank' } = value

    const result = await pool.query(`
      INSERT INTO savings (user_id, name, balance, target_amount, interest_rate, color, icon)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, name, balance, targetAmount, interestRate, color, icon])

    res.status(201).json({
      message: 'Savings pot created successfully',
      saving: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Update saving pot
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { error, value } = savingsSchema.validate(req.body)
    if (error) throw error

    const { name, balance, targetAmount, interestRate, color, icon } = value

    const result = await pool.query(`
      UPDATE savings
      SET name = $1, balance = $2, target_amount = $3, interest_rate = $4, color = $5, icon = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `, [name, balance, targetAmount, interestRate, color, icon, id, req.user.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Savings pot not found' })
    }

    res.json({
      message: 'Savings pot updated successfully',
      saving: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Delete saving pot
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM savings WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Savings pot not found' })
    }

    res.json({ message: 'Savings pot deleted successfully' })
  } catch (error) {
    next(error)
  }
})

export default router
