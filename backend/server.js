import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Routes
import authRoutes from './routes/auth.js'
import transactionRoutes from './routes/transactions.js'
import budgetRoutes from './routes/budgets.js'
import goalRoutes from './routes/goals.js'
import analyticsRoutes from './routes/analytics.js'
import recurringRoutes from './routes/recurring.js'
import debtRoutes from './routes/debts.js'
import taxRoutes from './routes/taxes.js'
import tipsRoutes from './routes/tips.js'

// Middleware
import { authenticateToken } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Security & Performance
app.use(helmet())
app.use(compression())
// Allow all origins in development, otherwise use specific origin
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.FRONTEND_URL || 'http://localhost:5173') 
    : '*',
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

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Static files (for receipt uploads)
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Public routes
app.use('/api/auth', authRoutes)

// Protected routes
app.use('/api/transactions', authenticateToken, transactionRoutes)
app.use('/api/budgets', authenticateToken, budgetRoutes)
app.use('/api/goals', authenticateToken, goalRoutes)
app.use('/api/analytics', authenticateToken, analyticsRoutes)
app.use('/api/recurring', authenticateToken, recurringRoutes)
app.use('/api/debts', authenticateToken, debtRoutes)
app.use('/api/taxes', authenticateToken, taxRoutes)
app.use('/api/tips', tipsRoutes) // Public tips, but can add auth for user tips

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
})
