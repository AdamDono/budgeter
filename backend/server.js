import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import aiRoutes from './routes/ai.js'
import analyticsRoutes from './routes/analytics.js'
import authRoutes from './routes/auth.js'
import billsRoutes from './routes/bills.js'
import budgetRoutes from './routes/budgets.js'
import creditRoutes from './routes/credit.js'
import debtRoutes from './routes/debts.js'
import goalRoutes from './routes/goals.js'
import recurringRoutes from './routes/recurring.js'
import savingsRoutes from './routes/savings.js'
import taxRoutes from './routes/taxes.js'
import tipsRoutes from './routes/tips.js'
import transactionRoutes from './routes/transactions.js'

// Middleware
import { pool } from './database/connection.js'
import { ensureDatabaseSchema } from './database/runMigrations.js'
import { authenticateToken } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import { startAllCrons } from './utils/cron.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Trust Render's reverse proxy (required for rate limiting + secure cookies)
app.set('trust proxy', 1)

// Security & Performance
app.use(helmet())
app.use(compression())
app.use(cookieParser())
// Allow all origins in development, otherwise use specific origin
const allowedOrigins = [
  'https://pacefinances.co.za',
  'https://www.pacefinances.co.za',
  'https://pacefinance.onrender.com',
  'https://pacedebt.onrender.com',
  process.env.FRONTEND_URL,
].filter(Boolean)

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.pacefinances.co.za') ||
          origin.endsWith('.onrender.com')
        ) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      }
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'],
  credentials: true,
}
app.use(cors(corsOptions))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 for dev, 100 for production
  message: 'Too many requests from this IP, please try again later'
})
app.use('/api/', limiter)

// Body parsing (25mb limit to support base64 PDF bank statements & payslip images)
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ limit: '25mb', extended: true }))

// Request Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// Static files (for receipt uploads)
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Health check (also touches Aiven DB so external monitors / keep-alives keep PG warm)
const healthHandler = async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'OK', db: 'connected', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(200).json({ status: 'OK', db: 'waking', timestamp: new Date().toISOString() })
  }
}
app.get('/health', healthHandler)
app.get('/api/health', healthHandler)

// Public routes
app.use('/api/auth', authRoutes)

// Protected routes
app.use('/api/ai', authenticateToken, aiRoutes)
app.use('/api/transactions', authenticateToken, transactionRoutes)
app.use('/api/budgets', authenticateToken, budgetRoutes)
app.use('/api/goals', authenticateToken, goalRoutes)
app.use('/api/analytics', authenticateToken, analyticsRoutes)
app.use('/api/recurring', authenticateToken, recurringRoutes)
app.use('/api/debts', authenticateToken, debtRoutes)
app.use('/api/taxes', authenticateToken, taxRoutes)
app.use('/api/credit', authenticateToken, creditRoutes)
app.use('/api/savings', authenticateToken, savingsRoutes)
app.use('/api/tips', tipsRoutes) // Public tips, but can add auth for user tips
app.use('/api/bills', authenticateToken, billsRoutes)

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  await ensureDatabaseSchema()
  startAllCrons()
})
