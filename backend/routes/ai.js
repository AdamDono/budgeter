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

    // 1. Gather FULL Financial Context for the AI
    let accounts, debts, recentTx, budget, goals, bills, recurring, monthlySummary;
    try {
      const results = await Promise.all([
        // All active accounts
        pool.query(`
          SELECT name, balance
          FROM accounts
          WHERE user_id = $1 AND is_active = true
          ORDER BY balance DESC
        `, [req.user.id]),

        // All active debts
        pool.query(`
          SELECT name, balance, interest_rate, monthly_payment, type
          FROM debts 
          WHERE user_id = $1 AND balance > 0
          ORDER BY interest_rate DESC
        `, [req.user.id]),

        // Last 200 transactions so the AI can answer historical questions
        pool.query(`
          SELECT t.description, t.amount, t.type, t.transaction_date,
                 c.name as category, a.name as account
          FROM transactions t
          LEFT JOIN budget_categories c ON t.category_id = c.id
          LEFT JOIN accounts a ON t.account_id = a.id
          WHERE t.user_id = $1 
          ORDER BY t.transaction_date DESC 
          LIMIT 200
        `, [req.user.id]),

        // Budget categories this month
        pool.query(`
          SELECT c.name, c.monthly_limit, COALESCE(SUM(t.amount), 0) as spent,
                 c.monthly_limit - COALESCE(SUM(t.amount), 0) as remaining
          FROM budget_categories c
          LEFT JOIN transactions t ON c.id = t.category_id AND t.type = 'expense' 
            AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
          WHERE c.user_id = $1 OR c.user_id IS NULL
          GROUP BY c.id, c.name, c.monthly_limit
          HAVING c.monthly_limit > 0
          ORDER BY spent DESC
        `, [req.user.id]),

        // Financial Goals
        pool.query(`
          SELECT name, description, target_amount, current_amount, target_date,
                 ROUND((current_amount / NULLIF(target_amount, 0)) * 100, 1) as progress_pct,
                 is_achieved
          FROM goals
          WHERE user_id = $1 AND is_achieved = false
          ORDER BY target_date ASC NULLS LAST
        `, [req.user.id]),

        // Upcoming bills in next 30 days
        pool.query(`
          SELECT name, amount, due_date, is_paid, frequency
          FROM bill_reminders
          WHERE user_id = $1 AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + 30
          ORDER BY due_date ASC
        `, [req.user.id]),

        // Recurring income/expenses
        pool.query(`
          SELECT description, amount, type, frequency, next_due_date
          FROM recurring_transactions
          WHERE user_id = $1 AND is_active = true
          ORDER BY type, amount DESC
        `, [req.user.id]),

        // Monthly income vs expense summary for the last 6 months
        pool.query(`
          SELECT 
            TO_CHAR(DATE_TRUNC('month', transaction_date), 'Mon YYYY') as month,
            DATE_TRUNC('month', transaction_date) as month_date,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
            COUNT(*) as transaction_count
          FROM transactions
          WHERE user_id = $1 
            AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
          GROUP BY DATE_TRUNC('month', transaction_date)
          ORDER BY month_date DESC
        `, [req.user.id]),
      ])

      accounts       = results[0]
      debts          = results[1]
      recentTx       = results[2]
      budget         = results[3]
      goals          = results[4]
      bills          = results[5]
      recurring      = results[6]
      monthlySummary = results[7]
    } catch (dbError) {
      console.error('--- DB CONTEXT ERROR ---')
      console.error(dbError)
      return res.status(500).json({ error: 'Database error while gathering context: ' + dbError.message })
    }

    // 2. Build a rich, structured context string
    const totalDebt = debts.rows.reduce((sum, d) => sum + parseFloat(d.balance || 0), 0)
    const totalBalance = accounts.rows.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0)
    const income = recentTx.rows.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)

    const context = `
You are the "Pace AI Financial Coach", a helpful, elite financial advisor for a South African user.
Your goal is to provide proactive, smart, and encouraging financial advice based on THEIR SPECIFIC data.
Use South African Rand (R) for all currency mentions. Today's date is ${new Date().toLocaleDateString('en-ZA')}.

=== USER'S COMPLETE FINANCIAL PICTURE ===

** ACCOUNTS (All active accounts / "pots") **
${accounts.rows.length > 0 
  ? accounts.rows.map(a => `- ${a.name}: R${parseFloat(a.balance).toFixed(2)}`).join('\n')
  : '- No accounts found'}
Total across all accounts: R${totalBalance.toFixed(2)}

** DEBTS & LOANS **
${debts.rows.length > 0
  ? debts.rows.map(d => `- ${d.name}: R${parseFloat(d.balance).toFixed(2)} balance | ${d.interest_rate}% interest | R${d.monthly_payment}/month repayment | Type: ${d.type}`).join('\n')
  : '- No debts recorded'}
Total debt: R${totalDebt.toFixed(2)}

** FINANCIAL GOALS (Savings Pots/Targets) **
${goals.rows.length > 0
  ? goals.rows.map(g => `- ${g.name}: R${parseFloat(g.current_amount).toFixed(2)} saved of R${parseFloat(g.target_amount).toFixed(2)} target (${g.progress_pct}% done)${g.target_date ? ` | Target date: ${g.target_date}` : ''}${g.description ? ` | Note: ${g.description}` : ''}`).join('\n')
  : '- No savings goals set up yet'}

** MONTHLY BUDGET PROGRESS **
${budget.rows.length > 0
  ? budget.rows.map(b => `- ${b.name}: R${parseFloat(b.spent).toFixed(2)} spent of R${parseFloat(b.monthly_limit).toFixed(2)} budget (R${parseFloat(b.remaining).toFixed(2)} remaining)`).join('\n')
  : '- No budget categories set up'}

** UPCOMING BILLS (Next 30 days) **
${bills.rows.length > 0
  ? bills.rows.map(b => `- ${b.name}: R${b.amount} due on ${b.due_date}${b.is_paid ? ' (PAID)' : ' (UNPAID)'} | ${b.frequency}`).join('\n')
  : '- No upcoming bills'}

** RECURRING PAYMENTS & INCOME **
${recurring.rows.length > 0
  ? recurring.rows.map(r => `- ${r.type === 'income' ? 'INCOME' : 'EXPENSE'}: ${r.description} R${r.amount} | ${r.frequency} | Next: ${r.next_due_date}`).join('\n')
  : '- No recurring items set up'}

** MONTHLY SPENDING SUMMARY (Last 6 months) **
${monthlySummary.rows.length > 0
  ? monthlySummary.rows.map(m => `- ${m.month}: Income R${parseFloat(m.total_income).toFixed(2)} | Expenses R${parseFloat(m.total_expenses).toFixed(2)} | Net R${(parseFloat(m.total_income) - parseFloat(m.total_expenses)).toFixed(2)} | ${m.transaction_count} transactions`).join('\n')
  : '- No monthly history available yet'}

** FULL TRANSACTION HISTORY (Last 200 — use this to answer date-specific questions) **
${recentTx.rows.map(t => `- ${t.transaction_date}: ${t.type === 'income' ? '+' : '-'}R${parseFloat(t.amount).toFixed(2)} | ${t.description}${t.category ? ` [${t.category}]` : ''}${t.account ? ` via ${t.account}` : ''}`).join('\n')}

=== COACHING INSTRUCTIONS ===
1. Always reference specific numbers from the data above — never be vague.
2. If the user asks about their "pots", goals, or savings targets — use the FINANCIAL GOALS section above.
3. If they ask about affordability, check their total account balance AND remaining budget.
4. Prioritise paying off high-interest debts (above 15% interest rate) — especially ${debts.rows.filter(d => parseFloat(d.interest_rate) >= 15).map(d => d.name).join(', ') || 'none currently'}.
5. Be encouraging and direct — South African context applies (ZAR, local cost of living).
6. If a goal is close to completion, celebrate it and motivate them to push through.
7. Keep responses concise and well-formatted with bullet points or short paragraphs.
    `

    // 3. Initialize Gemini 2.5 Flash
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: context
    })

    // 4. Format history for Gemini (must start with 'user' role)
    let formattedHistory = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }))

    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory = formattedHistory.slice(1)
    }

    const chat = model.startChat({ history: formattedHistory })

    const result = await chat.sendMessage(message)
    const responseText = result.response.text()

    res.json({ response: responseText })

  } catch (error) {
    console.error('--- AI BACKEND ERROR ---')
    console.error('Error Type:', error.constructor.name)
    console.error('Error Message:', error.message)
    
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
