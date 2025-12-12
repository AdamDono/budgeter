import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'

const router = express.Router()

// Validation schema
const tipSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  category: Joi.string().valid('saving', 'budgeting', 'investing', 'debt', 'lifestyle').required(),
  details: Joi.array().items(Joi.string()).optional(),
})

// Get all tips (public)
router.get('/', async (req, res, next) => {
  try {
    const { category, limit = 50 } = req.query

    let query = `
      SELECT t.*, u.first_name as author_first, u.last_name as author_last,
             COUNT(DISTINCT tl.id) as likes,
             COUNT(DISTINCT tc.id) as comments
      FROM budget_tips t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN tip_likes tl ON t.id = tl.tip_id
      LEFT JOIN tip_comments tc ON t.id = tc.tip_id
      WHERE t.is_published = TRUE
    `
    const params = []

    if (category && category !== 'all') {
      query += ` AND t.category = $${params.length + 1}`
      params.push(category)
    }

    query += ` GROUP BY t.id, u.first_name, u.last_name
      ORDER BY t.created_at DESC
      LIMIT $${params.length + 1}`
    params.push(limit)

    const result = await pool.query(query, params)

    res.json({ tips: result.rows })
  } catch (error) {
    next(error)
  }
})

// Get user's tips
router.get('/user/my-tips', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT * FROM budget_tips
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id])

    res.json({ tips: result.rows })
  } catch (error) {
    next(error)
  }
})

// Create new tip
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = tipSchema.validate(req.body)
    if (error) throw error

    const { title, description, category, details } = value

    const result = await pool.query(`
      INSERT INTO budget_tips (user_id, title, description, category, details, is_published)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING *
    `, [req.user.id, title, description, category, JSON.stringify(details || [])])

    res.status(201).json({
      message: 'Tip shared successfully',
      tip: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Update tip
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { error, value } = tipSchema.validate(req.body)
    if (error) throw error

    const { title, description, category, details } = value

    const result = await pool.query(`
      UPDATE budget_tips
      SET title = $1, description = $2, category = $3, details = $4
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [title, description, category, JSON.stringify(details || []), id, req.user.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tip not found' })
    }

    res.json({
      message: 'Tip updated successfully',
      tip: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Delete tip
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM budget_tips WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tip not found' })
    }

    res.json({ message: 'Tip deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Like a tip
router.post('/:id/like', async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if already liked
    const existingLike = await pool.query(
      'SELECT * FROM tip_likes WHERE tip_id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (existingLike.rows.length > 0) {
      // Unlike
      await pool.query(
        'DELETE FROM tip_likes WHERE tip_id = $1 AND user_id = $2',
        [id, req.user.id]
      )
      return res.json({ message: 'Tip unliked', liked: false })
    }

    // Like
    await pool.query(
      'INSERT INTO tip_likes (tip_id, user_id) VALUES ($1, $2)',
      [id, req.user.id]
    )

    res.json({ message: 'Tip liked', liked: true })
  } catch (error) {
    next(error)
  }
})

// Add comment to tip
router.post('/:id/comment', async (req, res, next) => {
  try {
    const { id } = req.params
    const { comment } = req.body

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' })
    }

    const result = await pool.query(`
      INSERT INTO tip_comments (tip_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, req.user.id, comment])

    res.status(201).json({
      message: 'Comment added',
      comment: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Get comments for tip
router.get('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(`
      SELECT tc.*, u.first_name, u.last_name
      FROM tip_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.tip_id = $1
      ORDER BY tc.created_at DESC
    `, [id])

    res.json({ comments: result.rows })
  } catch (error) {
    next(error)
  }
})

export default router
