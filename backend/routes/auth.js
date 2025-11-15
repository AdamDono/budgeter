import express from 'express'
import bcrypt from 'bcryptjs'
import Joi from 'joi'
import { pool } from '../database/connection.js'
import { generateToken } from '../middleware/auth.js'

const router = express.Router()

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  phone: Joi.string().optional(),
  idNumber: Joi.string().length(13).optional()
})

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body)
    if (error) throw error

    const { email, password, firstName, lastName, phone, idNumber } = value

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' })
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, id_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name`,
      [email, passwordHash, firstName, lastName, phone, idNumber]
    )

    const user = result.rows[0]

    // Create default settings
    await pool.query(
      'INSERT INTO user_settings (user_id) VALUES ($1)',
      [user.id]
    )

    // Create default account
    await pool.query(
      `INSERT INTO accounts (user_id, account_type_id, name, balance)
       VALUES ($1, 1, 'Main Account', 0.00)`,
      [user.id]
    )

    // Generate token
    const token = generateToken(user.id)

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      token
    })
  } catch (error) {
    next(error)
  }
})

// Login user
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body)
    if (error) throw error

    const { email, password } = value

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate token
    const token = generateToken(user.id)

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      token
    })
  } catch (error) {
    next(error)
  }
})

// Get current user profile
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, profile_picture FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user: result.rows[0] })
  } catch (error) {
    next(error)
  }
})

export default router
