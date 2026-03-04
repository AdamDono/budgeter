import { GoogleGenerativeAI } from '@google/generative-ai'
import express from 'express'
import { pool } from '../database/connection.js'

const router = express.Router()

// Endpoint for Financial Coach Chat
router.post('/chat', async (req, res, next) => {
  try {
    const { message, history = [] } = req.body
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Gemini API Key is missing. Please add GEMINI_API_KEY to your backend .env file.' 
      })
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // 1. Gather Financial Context for the AI
    let accounts, debts, recentTx, budget;
    try {
      const results = await Promise.all([
        pool.query('SELECT name, balance FROM accounts WHERE user_id = $1 AND is_active = true', [req.user.id]),
        pool.query('SELECT name, balance, interest_rate FROM debts WHERE user_id = $1', [req.user.id]),
        pool.query('SELECT description, amount, type, transaction_date FROM transactions WHERE user_id = $1 ORDER BY transaction_date DESC LIMIT 5', [req.user.id]),
        pool.query(`
          SELECT c.name, c.monthly_limit, COALESCE(SUM(t.amount), 0) as spent
          FROM budget_categories c
          LEFT JOIN transactions t ON c.id = t.category_id AND t.type = 'expense' 
            AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
          WHERE c.user_id = $1 OR c.user_id IS NULL
          GROUP BY c.id, c.name, c.monthly_limit
          HAVING c.monthly_limit > 0
        `, [req.user.id])
      ])
      accounts = results[0];
      debts = results[1];
      recentTx = results[2];
      budget = results[3];
    } catch (dbError) {
      console.error('--- DB CONTEXT ERROR ---')
      console.error(dbError)
      return res.status(500).json({ error: 'Database error while gathering context: ' + dbError.message })
    }

    const context = `
      You are the "Pace AI Financial Coach", a helpful, elite financial advisor for a South African user.
      Your goal is to provide proactive, smart, and encouraging financial advice based on their data.
      Use South African Rand (R) for all currency mentions.
      
      User's Financial Snapshot:
      - Accounts: ${accounts.rows.map(a => `${a.name}: R${a.balance}`).join(', ')}
      - Current Debts: ${debts.rows.map(d => `${d.name}: R${d.balance} (${d.interest_rate}% interest)`).join(', ')}
      - Monthly Budget Progress: ${budget.rows.map(b => `${b.name}: R${b.spent} of R${b.monthly_limit}`).join(', ')}
      - Recent Activity: ${recentTx.rows.map(t => `${t.type === 'income' ? '+' : '-'}R${t.amount} ${t.description}`).join(', ')}

      Instructions:
      1. Be concise but insightful.
      2. If asked about affordability, check their budget and account balances.
      3. If they have high-interest debt (like Wonga or 20%+ loans), subtly suggest paying those off first.
      4. Avoid generic advice; use the specific numbers provided above.
      5. Keep the tone professional yet friendly.
    `
    
    console.log('--- AI CONTEXT SENT TO GEMINI ---')
    console.log(context)

    // 2. Initialize Gemini 1.5 Flash
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: context
    })

    // 3. Format history for Gemini
    // Gemini history requires alternating roles and MUST start with a 'user' role.
    let formattedHistory = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }))

    // If history starts with model (assistant), remove it as Gemini requires user to start
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory = formattedHistory.slice(1)
    }

    const chat = model.startChat({
      history: formattedHistory,
    })

    const result = await chat.sendMessage(message)
    const responseText = result.response.text()

    res.json({ response: responseText })

  } catch (error) {
    console.error('--- AI BACKEND ERROR ---')
    console.error('Error Type:', error.constructor.name)
    console.error('Error Message:', error.message)
    if (error.response) {
      console.error('Error Response Data:', error.response.data)
    }
    
    // Check for common Gemini errors
    if (error.message?.includes('API_KEY_INVALID')) {
        return res.status(401).json({ error: 'Invalid Gemini API Key. Please check your .env file.' })
    }
    if (error.message?.includes('404') && error.message?.includes('model')) {
        return res.status(404).json({ error: 'Gemini model not found. Check your model name or API access.' })
    }

    res.status(500).json({ 
      error: 'AI Coach is having a moment. ' + (error.message || 'Unknown error'),
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

export default router
