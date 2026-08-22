import jwt from 'jsonwebtoken'
import { pool } from '../database/connection.js'

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const headerToken = authHeader && authHeader.split(' ')[1]
  const cookieToken = req.cookies.token
  
  const token = cookieToken || headerToken

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Attach baseline authenticated identity from signed token
    req.user = { id: decoded.userId }

    try {
      const result = await pool.query(
        'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
        [decoded.userId]
      )
      if (result.rows.length > 0) {
        req.user = result.rows[0]
      }
    } catch (dbErr) {
      console.warn('Auth DB ping transient error (using signed token payload):', dbErr.message)
    }
    
    next()
  } catch (error) {
    console.error('Auth error:', error.message)
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}
