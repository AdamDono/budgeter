import express from 'express'
import { pool } from '../database/connection.js'

const router = express.Router()

// Get latest credit score and history
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT score, last_updated, provider FROM credit_scores WHERE user_id = $1 ORDER BY last_updated DESC LIMIT 12',
      [req.user.id]
    )
    
    const latestScore = result.rows[0] || { score: 0, last_updated: null, provider: 'Manual' }
    const history = result.rows
    
    res.json({ latestScore, history })
  } catch (error) {
    next(error)
  }
})

// Update/Add new credit score
router.post('/', async (req, res, next) => {
  try {
    const { score, provider = 'Manual' } = req.body
    
    if (!score || score < 300 || score > 850) {
      return res.status(400).json({ error: 'Valid credit score (300-850) is required' })
    }

    const result = await pool.query(
      'INSERT INTO credit_scores (user_id, score, provider) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, score, provider]
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

export default router
