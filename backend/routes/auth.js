import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'
import { authenticateToken, generateToken } from '../middleware/auth.js'

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

    // Set cookie
    const isProduction = process.env.NODE_ENV === 'production'
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      // 'none' required for cross-origin (frontend/backend on different subdomains)
      // 'lax' for local dev
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

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

    // Set cookie
    const isProduction = process.env.NODE_ENV === 'production'
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

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
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    // req.user is already populated by authenticateToken middleware
    res.json({ user: req.user })
  } catch (error) {
    next(error)
  }
})

// Logout
router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production'
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  })
  res.json({ message: 'Logged out successfully' })
})

// Forgot Password - Send Token
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (userResult.rows.length === 0) {
      // Don't reveal if user exists for security, but we'll return success anyway
      return res.json({ message: 'If that email exists in our system, a reset link has been sent!' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 3600000) // 1 hour

    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expiry = $2 WHERE id = $3',
      [token, expiry, userResult.rows[0].id]
    )

    // LOCAL DEV: Log the reset link since we don't have a mailer yet
    console.log('\n----------------------------------------')
    console.log('🔗 PASSWORD RESET LINK (LOCAL DEV ONLY):')
    console.log(`http://localhost:5173/reset-password/${token}`)
    console.log('----------------------------------------\n')

    res.json({ message: 'If that email exists in our system, a reset link has been sent!' })
  } catch (error) {
    next(error)
  }
})

// Reset Password - Verify and Update
router.post('/reset-password/:token', async (req, res, next) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' })
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expiry > NOW()',
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    const userId = result.rows[0].id
    const passwordHash = await bcrypt.hash(password, 12)

    await pool.query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expiry = NULL WHERE id = $2',
      [passwordHash, userId]
    )

    res.json({ message: 'Password has been reset successfully! You can now log in.' })
  } catch (error) {
    next(error)
  }
})

export default router
