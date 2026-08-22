import { GoogleGenerativeAI } from '@google/generative-ai'
import express from 'express'
import { pool } from '../database/connection.js'

const router = express.Router()

// Helper to compile user's financial details into a text context for Gemini
async function compileFinancialContext(userId) {
  const queries = [
    // 0. All active accounts
    pool.query(`
      SELECT name, balance
      FROM accounts
      WHERE user_id = $1 AND is_active = true
      ORDER BY balance DESC
    `, [userId]),

    // 1. All active debts
    pool.query(`
      SELECT name, balance, interest_rate, monthly_payment, type
      FROM debts 
      WHERE user_id = $1 AND balance > 0
      ORDER BY interest_rate DESC
    `, [userId]),

    // 2. Last 200 transactions
    pool.query(`
      SELECT t.description, t.amount, t.type, t.transaction_date,
             c.name as category, a.name as account
      FROM transactions t
      LEFT JOIN budget_categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = $1 
      ORDER BY t.transaction_date DESC 
      LIMIT 200
    `, [userId]),

    // 3. Budget categories this month
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
    `, [userId]),

    // 4. Financial Goals
    pool.query(`
      SELECT name, description, target_amount, current_amount, target_date,
             ROUND((current_amount / NULLIF(target_amount, 0)) * 100, 1) as progress_pct,
             is_achieved
      FROM goals
      WHERE user_id = $1 AND is_achieved = false
      ORDER BY target_date ASC NULLS LAST
    `, [userId]),

    // 5. Upcoming bills in next 30 days
    pool.query(`
      SELECT name, amount, due_date, is_paid, frequency
      FROM bill_reminders
      WHERE user_id = $1 AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + 30
      ORDER BY due_date ASC
    `, [userId]),

    // 6. Recurring income/expenses
    pool.query(`
      SELECT description, amount, type, frequency, next_due_date
      FROM recurring_transactions
      WHERE user_id = $1 AND is_active = true
      ORDER BY type, amount DESC
    `, [userId]),

    // 7. Monthly income vs expense summary for the last 6 months
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
    `, [userId]),
  ]

  const results = await Promise.allSettled(queries)
  const extractRows = (res) => (res.status === 'fulfilled' && res.value?.rows) ? res.value.rows : []

  const accountsRows       = extractRows(results[0])
  const debtsRows          = extractRows(results[1])
  const recentTxRows       = extractRows(results[2])
  const budgetRows         = extractRows(results[3])
  const goalsRows          = extractRows(results[4])
  const billsRows          = extractRows(results[5])
  const recurringRows      = extractRows(results[6])
  const monthlySummaryRows = extractRows(results[7])

  const totalDebt = debtsRows.reduce((sum, d) => sum + parseFloat(d.balance || 0), 0)
  const totalBalance = accountsRows.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0)

  const today = new Date()
  const todayISO = today.toISOString().split('T')[0]
  const currentYear = today.getFullYear()
  const currentMonthName = today.toLocaleString('en-ZA', { month: 'long' })
  const currentDay = today.getDate()

  return `
=== CRITICAL TEMPORAL REAL-WORLD CONSTRAINTS ===
- TODAY'S EXACT REAL-WORLD DATE: ${todayISO} (${currentDay} ${currentMonthName} ${currentYear}).
- CURRENT YEAR: STRICTLY ${currentYear}. NEVER state or calculate as if the year is 2025.
- Currency: South African Rand (R).

=== GOAL DEADLINES & TARGET DATE RULES ===
- When analyzing a goal's target date, compare it against TODAY (${todayISO}):
  * If the target date is BEFORE today (i.e. already passed), clearly tell the user: "Your target date of [Date] has passed. Let's adjust your timeline or set a new target date to reach your goal!"
  * If the target date is in the FUTURE, compute the remaining months accurately between today (${todayISO}) and the target date. Do not count backwards or hallucinate extra months.

=== USER'S COMPLETE FINANCIAL PICTURE ===

** ACCOUNTS (All active accounts / "pots") **
${accountsRows.length > 0 
  ? accountsRows.map(a => `- ${a.name}: R${parseFloat(a.balance).toFixed(2)}`).join('\n')
  : '- No accounts found'}
Total across all accounts: R${totalBalance.toFixed(2)}

** DEBTS & LOANS **
${debtsRows.length > 0
  ? debtsRows.map(d => `- ${d.name}: R${parseFloat(d.balance).toFixed(2)} balance | ${d.interest_rate}% interest | R${d.monthly_payment}/month repayment | Type: ${d.type}`).join('\n')
  : '- No debts recorded'}
Total debt: R${totalDebt.toFixed(2)}

** FINANCIAL GOALS (Savings Pots/Targets) **
${goalsRows.length > 0
  ? goalsRows.map(g => `- ${g.name}: R${parseFloat(g.current_amount).toFixed(2)} saved of R${parseFloat(g.target_amount).toFixed(2)} target (${g.progress_pct}% done)${g.target_date ? ` | Target date: ${g.target_date}` : ''}${g.description ? ` | Note: ${g.description}` : ''}`).join('\n')
  : '- No savings goals set up yet'}

** MONTHLY BUDGET PROGRESS **
${budgetRows.length > 0
  ? budgetRows.map(b => `- ${b.name}: R${parseFloat(b.spent).toFixed(2)} spent of R${parseFloat(b.monthly_limit).toFixed(2)} budget (R${parseFloat(b.remaining).toFixed(2)} remaining)`).join('\n')
  : '- No budget categories set up'}

** UPCOMING BILLS (Next 30 days) **
${billsRows.length > 0
  ? billsRows.map(b => `- ${b.name}: R${b.amount} due on ${b.due_date}${b.is_paid ? ' (PAID)' : ' (UNPAID)'} | ${b.frequency}`).join('\n')
  : '- No upcoming bills'}

** RECURRING PAYMENTS & INCOME **
${recurringRows.length > 0
  ? recurringRows.map(r => `- ${r.type === 'income' ? 'INCOME' : 'EXPENSE'}: ${r.description} R${r.amount} | ${r.frequency} | Next: ${r.next_due_date}`).join('\n')
  : '- No recurring items set up'}

** MONTHLY SPENDING SUMMARY (Last 6 months) **
${monthlySummaryRows.length > 0
  ? monthlySummaryRows.map(m => `- ${m.month}: Income R${parseFloat(m.total_income).toFixed(2)} | Expenses R${parseFloat(m.total_expenses).toFixed(2)} | Net R${(parseFloat(m.total_income) - parseFloat(m.total_expenses)).toFixed(2)} | ${m.transaction_count} transactions`).join('\n')
  : '- No monthly history available yet'}

** FULL TRANSACTION HISTORY (Last 200 - use this to answer date-specific questions) **
${recentTxRows.map(t => `- ${t.transaction_date}: ${t.type === 'income' ? '+' : '-'}R${parseFloat(t.amount).toFixed(2)} | ${t.description}${t.category ? ` [${t.category}]` : ''}${t.account ? ` via ${t.account}` : ''}`).join('\n')}
`
}

// ─── AI Strategic Briefing Endpoint (Dashboard) ────────────────────────────────
router.get('/briefing', async (req, res, next) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API Key missing' })
    }

    const context = await compileFinancialContext(req.user.id)
    const systemPrompt = `
You are the "Pace AI Financial Coach". Your task is to analyze the user's financial context and write a customized, highly tactical "Strategic Briefing" for their dashboard.

You must respond with raw JSON in the following format:
{
  "headline": "A short, engaging surplus or deficit status sentence (max 12 words). Include a relevant emoji.",
  "suggestion": "An actionable, tactical financial recommendation referencing real numbers from their context (max 20 words). Must relate to their goals, debts, or budgets.",
  "action": "A redirect route path string. Must be exactly one of: '/app/debt' (if suggesting debt snowball/payoff), '/app/savings' (if suggesting goal savings), '/app/transactions' (if suggesting budget cuts/expense review), '/app/bills' (if warning about upcoming bills)."
}

Do not include any markdown styling, code blocks, or triple backticks in the response. Return raw JSON text only.

=== COACHING INSTRUCTIONS ===
1. Use real numbers and specific references from the user data (like Woolworths, FNB, Standard Bank credit card, target savings pot).
2. Prioritize high-interest debt paydown or budget deficits.
3. Be direct, encouraging, and South African context aware.

${context}
`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    })

    const result = await model.generateContent(systemPrompt)
    const responseText = result.response.text().trim()
    const parsed = JSON.parse(responseText)

    res.json({ briefing: parsed })

  } catch (error) {
    console.error('--- AI BRIEFING ERROR ---')
    console.error(error)
    res.status(500).json({ error: 'Briefing generation failed: ' + error.message })
  }
})

// ─── GET User Conversations ────────────────────────────────────────────────────
router.get('/conversations', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, title, created_at FROM chat_conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    )
    res.json({ conversations: result.rows })
  } catch (error) {
    next(error)
  }
})

// ─── POST Create Conversation ──────────────────────────────────────────────────
router.post('/conversations', async (req, res, next) => {
  try {
    const { title = 'New Chat' } = req.body
    const result = await pool.query(
      'INSERT INTO chat_conversations (user_id, title) VALUES ($1, $2) RETURNING *',
      [req.user.id, title]
    )
    res.status(201).json({ conversation: result.rows[0] })
  } catch (error) {
    next(error)
  }
})

// ─── GET Conversation Messages ─────────────────────────────────────────────────
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params
    // Verify ownership
    const ownership = await pool.query(
      'SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )
    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    const messages = await pool.query(
      'SELECT role, content, created_at FROM chat_messages WHERE conversation_id = $1 ORDER BY id ASC',
      [id]
    )
    res.json({ messages: messages.rows })
  } catch (error) {
    next(error)
  }
})

// ─── DELETE Conversation ───────────────────────────────────────────────────────
router.delete('/conversations/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'DELETE FROM chat_conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' })
    }
    res.json({ message: 'Conversation deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Helper to sanitize database chat history for Gemini strict turn alternation
function sanitizeGeminiHistory(rows) {
  if (!rows || rows.length === 0) return []

  const formatted = []
  for (const row of rows) {
    if (!row.content || typeof row.content !== 'string' || !row.content.trim()) continue
    const role = row.role === 'assistant' ? 'model' : 'user'
    
    // Merge consecutive same-role messages
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts[0].text += '\n\n' + row.content.trim()
    } else {
      formatted.push({
        role,
        parts: [{ text: row.content.trim() }]
      })
    }
  }

  // Gemini requires history to start with a 'user' turn
  while (formatted.length > 0 && formatted[0].role === 'model') {
    formatted.shift()
  }

  // Gemini requires history to end with a 'model' turn before the new user message
  while (formatted.length > 0 && formatted[formatted.length - 1].role === 'user') {
    formatted.pop()
  }

  return formatted
}

// ─── Refactored Coach Chat Endpoint (Persisted to DB) ──────────────────────────
router.post('/chat', async (req, res, next) => {
  try {
    const { message, conversationId } = req.body
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API Key missing' })
    }
    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    let activeConvId = conversationId

    // 1. If no conversationId provided, create a new conversation
    if (!activeConvId) {
      const convResult = await pool.query(
        'INSERT INTO chat_conversations (user_id, title) VALUES ($1, $2) RETURNING id',
        [req.user.id, 'New Chat']
      )
      activeConvId = convResult.rows[0].id
    } else {
      // Verify ownership
      const check = await pool.query(
        'SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2',
        [activeConvId, req.user.id]
      )
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' })
      }
    }

    // 2. Load previous messages from DB to build Gemini chat history
    const prevMessagesResult = await pool.query(
      'SELECT role, content FROM chat_messages WHERE conversation_id = $1 ORDER BY id ASC',
      [activeConvId]
    )

    // Save user message to database
    await pool.query(
      'INSERT INTO chat_messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [activeConvId, 'user', message]
    )

    const context = await compileFinancialContext(req.user.id)
    const systemPrompt = `
You are the "Pace AI Financial Coach", a helpful, elite financial advisor for a South African user.
Your goal is to provide proactive, smart, and encouraging financial advice based on THEIR SPECIFIC data.

=== COACHING INSTRUCTIONS ===
1. Always reference specific numbers from the user context data - never be vague.
2. If the user asks about their "pots", goals, or savings targets - use the FINANCIAL GOALS section.
3. If they ask about affordability, check their total account balance AND remaining budget.
4. Prioritise paying off high-interest debts (above 15% interest rate).
5. Be encouraging and direct - South African cultural & financial context applies (ZAR, Lobola, Groceries, RA, local cost of living).
6. If a goal is close to completion, celebrate it and motivate them to push through.
7. Keep responses concise and well-formatted with bullet points or short paragraphs.

${context}
`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt
    })

    let responseText = ''
    try {
      const sanitizedHistory = sanitizeGeminiHistory(prevMessagesResult.rows)
      const chat = model.startChat({ history: sanitizedHistory })
      const result = await chat.sendMessage(message)
      responseText = result.response.text()
    } catch (chatErr) {
      console.warn('Gemini chat history fallback to direct prompt:', chatErr.message)
      const fallbackResult = await model.generateContent(message)
      responseText = fallbackResult.response.text()
    }

    // Save assistant message to database
    await pool.query(
      'INSERT INTO chat_messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [activeConvId, 'assistant', responseText]
    )

    // Update conversation timestamp
    await pool.query(
      'UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [activeConvId]
    )

    // 4. Auto-generate a descriptive title if title is 'New Chat' or this is the first message
    const currentConv = await pool.query('SELECT title FROM chat_conversations WHERE id = $1', [activeConvId])
    if (currentConv.rows.length > 0 && (currentConv.rows[0].title === 'New Chat' || prevMessagesResult.rows.length === 0)) {
      let finalTitle = ''
      try {
        const titleModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
        const titlePrompt = `Generate a very concise title (max 4 words, no punctuation, no quotes) for this financial user inquiry: "${message}". Return only the plain title.`
        const titleResult = await titleModel.generateContent(titlePrompt)
        finalTitle = titleResult.response.text().trim().replace(/['"“”]/g, '')
      } catch (err) {
        console.error('AI Title generation fallback:', err.message)
      }

      // Smart fallback from user query
      if (!finalTitle || finalTitle.length < 2) {
        const words = message.trim().replace(/[^\w\s]/gi, '').split(/\s+/).slice(0, 4).join(' ')
        finalTitle = words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Financial Chat'
      }

      if (finalTitle.length > 35) {
        finalTitle = finalTitle.slice(0, 32) + '...'
      }

      await pool.query(
        'UPDATE chat_conversations SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [finalTitle, activeConvId]
      )
    }

    res.json({ 
      response: responseText, 
      conversationId: activeConvId 
    })

  } catch (error) {
    console.error('--- AI BACKEND ERROR ---')
    console.error(error)
    res.status(500).json({ error: 'AI Coach error: ' + error.message })
  }
})

export default router
