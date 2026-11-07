import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection.js'
import { sendBudgetAlertEmail } from '../utils/mailer.js'

const router = express.Router()

// Validation schemas
const transactionSchema = Joi.object({
  categoryId: Joi.number().integer().allow(null).optional(),
  goalId: Joi.number().integer().allow(null).optional(),
  debtId: Joi.number().integer().allow(null).optional(),
  savingsId: Joi.number().integer().allow(null).optional(),
  billId: Joi.number().integer().allow(null).optional(),
  type: Joi.string().valid('income', 'expense').required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().max(500).required(),
  transactionDate: Joi.date().required(),
  tags: Joi.array().items(Joi.string()).optional()
})

// Get all transactions for user
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, categoryId, accountId, startDate, endDate, search } = req.query
    const offset = (page - 1) * limit

    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color,
             g.name as goal_name,
             d.name as debt_name,
             s.name as savings_name
      FROM transactions t
      LEFT JOIN budget_categories c ON t.category_id = c.id
      LEFT JOIN goals g ON t.goal_id = g.id
      LEFT JOIN debts d ON t.debt_id = d.id
      LEFT JOIN savings s ON t.savings_id = s.id
      WHERE t.user_id = $1
    `
    const params = [req.user.id]
    let paramCount = 1

    // Add filters
    if (type && type !== 'all') {
      query += ` AND t.type = $${++paramCount}`
      params.push(type)
    }
    if (categoryId && categoryId !== 'all') {
      query += ` AND t.category_id = $${++paramCount}`
      params.push(parseInt(categoryId))
    }
    if (startDate) {
      query += ` AND t.transaction_date >= $${++paramCount}`
      params.push(startDate)
    }
    if (endDate) {
      query += ` AND t.transaction_date <= $${++paramCount}`
      params.push(endDate)
    }
    if (search && search.trim() !== '') {
      query += ` AND t.description ILIKE $${++paramCount}`
      params.push(`%${search.trim()}%`)
    }

    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // Get total count for pagination with matching filters
    let countQuery = 'SELECT COUNT(*) FROM transactions t WHERE t.user_id = $1'
    const countParams = [req.user.id]
    let countParamCount = 1

    if (type && type !== 'all') {
      countQuery += ` AND t.type = $${++countParamCount}`
      countParams.push(type)
    }
    if (categoryId && categoryId !== 'all') {
      countQuery += ` AND t.category_id = $${++countParamCount}`
      countParams.push(parseInt(categoryId))
    }
    if (startDate) {
      countQuery += ` AND t.transaction_date >= $${++countParamCount}`
      countParams.push(startDate)
    }
    if (endDate) {
      countQuery += ` AND t.transaction_date <= $${++countParamCount}`
      countParams.push(endDate)
    }
    if (search && search.trim() !== '') {
      countQuery += ` AND t.description ILIKE $${++countParamCount}`
      countParams.push(`%${search.trim()}%`)
    }

    const countResult = await pool.query(countQuery, countParams)

    res.json({
      transactions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    })
  } catch (error) {
    next(error)
  }
})

// Create new transaction
router.post('/', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { error, value } = transactionSchema.validate(req.body)
    if (error) throw error

    const {
      categoryId, goalId, type, amount, description,
      transactionDate, tags
    } = value

    // Get or create default account for user
    let accountId = null
    const accountResult = await client.query(
      'SELECT id FROM accounts WHERE user_id = $1 LIMIT 1',
      [req.user.id]
    )
    
    if (accountResult.rows.length > 0) {
      accountId = accountResult.rows[0].id
    } else {
      // Create default account if none exists
      const accountTypeResult = await client.query(
        "SELECT id FROM account_types WHERE name = 'Checking' LIMIT 1"
      )
      const accountTypeId = accountTypeResult.rows[0]?.id || 1
      
      const newAccountResult = await client.query(
        `INSERT INTO accounts (user_id, account_type_id, name, bank_name, balance, currency)
         VALUES ($1, $2, 'My Account', 'Default Bank', 0.00, 'ZAR')
         RETURNING id`,
        [req.user.id, accountTypeId]
      )
      accountId = newAccountResult.rows[0].id
    }

    await client.query('BEGIN')

    // Create transaction
    const result = await client.query(
      `INSERT INTO transactions 
       (user_id, account_id, category_id, goal_id, debt_id, savings_id, bill_id, type, amount, description, 
        transaction_date, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [req.user.id, accountId, categoryId, goalId, value.debtId, value.savingsId, value.billId || null, type, amount, description,
       transactionDate, tags]
    )

    // Update account balance
    if (accountId) {
      const accountDelta = type === 'income' ? amount : -amount
      await client.query(
        'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [accountDelta, accountId]
      )
    }

    // Update goal progress if applicable
    if (goalId) {
      await client.query(
        `UPDATE goals 
         SET current_amount = current_amount + $1,
             is_achieved = CASE WHEN (current_amount + $1) >= target_amount THEN TRUE ELSE is_achieved END,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND user_id = $3`,
        [amount, goalId, req.user.id]
      )
    }

    // Update Debt balance if linked
    if (value.debtId && type === 'expense') {
      await client.query(
        'UPDATE debts SET balance = GREATEST(0, balance - $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
        [amount, value.debtId, req.user.id]
      )
    }

    // Update Savings balance if linked
    if (value.savingsId) {
      const balanceChange = type === 'expense' ? amount : -amount
      await client.query(
        'UPDATE savings SET balance = GREATEST(0, balance + $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
        [balanceChange, value.savingsId, req.user.id]
      )
    }

    // Mark Bill as paid / advance next due date if linked
    if (value.billId && type === 'expense') {
      const billRes = await client.query(
        'SELECT * FROM bill_reminders WHERE id = $1 AND user_id = $2',
        [value.billId, req.user.id]
      )
      if (billRes.rows.length > 0) {
        const bill = billRes.rows[0]
        if (bill.frequency) {
          const current = new Date(bill.due_date)
          if (bill.frequency === 'monthly') current.setMonth(current.getMonth() + 1)
          else if (bill.frequency === 'quarterly') current.setMonth(current.getMonth() + 3)
          else if (bill.frequency === 'yearly') current.setFullYear(current.getFullYear() + 1)
          const nextDueDate = current.toISOString().split('T')[0]
          await client.query(
            'UPDATE bill_reminders SET is_paid = FALSE, due_date = $1 WHERE id = $2 AND user_id = $3',
            [nextDueDate, value.billId, req.user.id]
          )
        } else {
          await client.query(
            'UPDATE bill_reminders SET is_paid = TRUE WHERE id = $1 AND user_id = $2',
            [value.billId, req.user.id]
          )
        }
      }
    }

    await client.query('COMMIT')

    // ② Budget exceeded alert, fire async, don't block the response
    if (type === 'expense' && categoryId) {
      checkAndSendBudgetAlert(req.user.id, categoryId).catch(err =>
        console.error('Budget alert check failed:', err.message)
      )
    }

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: result.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
})

// ─── Budget alert helper ────────────────────────────────────────────────────────
async function checkAndSendBudgetAlert(userId, categoryId) {
  // Get user, settings, category budget limit
  const infoResult = await pool.query(`
    SELECT
      u.email, u.first_name,
      s.budget_alerts, s.notifications_enabled,
      bc.name AS category_name,
      bc.monthly_limit
    FROM users u
    JOIN user_settings s ON u.id = s.user_id
    JOIN budget_categories bc ON bc.id = $2
    WHERE u.id = $1
  `, [userId, categoryId])

  if (!infoResult.rows.length) return
  const { email, first_name, budget_alerts, notifications_enabled, category_name, monthly_limit } = infoResult.rows[0]

  // Respect user toggles and only alert when a limit is actually set
  if (!budget_alerts || !notifications_enabled || !monthly_limit) return

  // Total spent this calendar month in this category
  const spentResult = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) AS spent
    FROM transactions
    WHERE user_id = $1
      AND category_id = $2
      AND type = 'expense'
      AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
  `, [userId, categoryId])

  const spent = parseFloat(spentResult.rows[0].spent)
  const limit = parseFloat(monthly_limit)

  if (spent <= limit) return // Not over budget yet

  const overage = spent - limit

  // Guard: only send once per day per category to avoid spamming
  const guardResult = await pool.query(`
    SELECT id FROM notifications
    WHERE user_id = $1
      AND type = 'budget_alert'
      AND message LIKE $2
      AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 1
  `, [userId, `%${category_name}%`])

  if (guardResult.rows.length > 0) return // Already sent today

  // Log notification in DB
  await pool.query(`
    INSERT INTO notifications (user_id, title, message, type, action_url)
    VALUES ($1, $2, $3, 'budget_alert', '/app/transactions')
  `, [
    userId,
    `Budget exceeded: ${category_name}`,
    `Spent R${spent.toFixed(2)} of R${limit.toFixed(2)} limit, R${overage.toFixed(2)} over budget`
  ])

  await sendBudgetAlertEmail(email, first_name, {
    categoryName: category_name,
    spent,
    limit,
    overage,
  })

  console.log(`✅ Budget alert sent to ${email} for category: ${category_name}`)
}

// Update transaction
router.put('/:id', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    const { error, value } = transactionSchema.validate(req.body)
    if (error) throw error

    // Get original transaction for balance adjustment
    const originalResult = await client.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    const original = originalResult.rows[0]
    const { categoryId, goalId, debtId, savingsId, type, amount, description, transactionDate, tags } = value

    await client.query('BEGIN')

    // Update transaction
    const result = await client.query(
      `UPDATE transactions 
       SET category_id = $1, goal_id = $2, debt_id = $3, savings_id = $4,
           type = $5, amount = $6, description = $7, transaction_date = $8, tags = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [categoryId, goalId, debtId, savingsId, type, amount, description, transactionDate, tags, id, req.user.id]
    )

    // 1. REVERSE ORIGINAL IMPACT
    if (original.account_id) {
      const origAccountDelta = original.type === 'income' ? -original.amount : original.amount
      await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [origAccountDelta, original.account_id])
    }
    if (original.debt_id && original.type === 'expense') {
      await client.query('UPDATE debts SET balance = balance + $1 WHERE id = $2', [original.amount, original.debt_id])
    }
    if (original.savings_id) {
      const originalChange = original.type === 'expense' ? original.amount : -original.amount
      await client.query('UPDATE savings SET balance = GREATEST(0, balance - $1) WHERE id = $2', [originalChange, original.savings_id])
    }
    if (original.goal_id) {
      await client.query('UPDATE goals SET current_amount = GREATEST(0, current_amount - $1) WHERE id = $2', [original.amount, original.goal_id])
    }

    // 2. APPLY NEW IMPACT
    if (original.account_id) {
      const newAccountDelta = type === 'income' ? amount : -amount
      await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [newAccountDelta, original.account_id])
    }
    if (debtId && type === 'expense') {
      await client.query('UPDATE debts SET balance = GREATEST(0, balance - $1) WHERE id = $2', [amount, debtId])
    }
    if (savingsId) {
      const newChange = type === 'expense' ? amount : -amount
      await client.query('UPDATE savings SET balance = GREATEST(0, balance + $1) WHERE id = $2', [newChange, savingsId])
    }
    if (goalId) {
      await client.query('UPDATE goals SET current_amount = current_amount + $1 WHERE id = $2', [amount, goalId])
    }

    await client.query('COMMIT')

    res.json({
      message: 'Transaction updated successfully',
      transaction: result.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
})

// Delete transaction
router.delete('/:id', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { id } = req.params

    // Get transaction for balance adjustment
    const result = await client.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    const transaction = result.rows[0]

    await client.query('BEGIN')

    // Delete transaction
    await client.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    // Reverse Account impact
    if (transaction.account_id) {
      const accountReverse = transaction.type === 'income' ? -transaction.amount : transaction.amount
      await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [accountReverse, transaction.account_id])
    }

    // Reverse Debt impact
    if (transaction.debt_id && transaction.type === 'expense') {
      await client.query('UPDATE debts SET balance = balance + $1 WHERE id = $2', [transaction.amount, transaction.debt_id])
    }

    // Reverse Savings impact
    if (transaction.savings_id) {
      const balanceChange = transaction.type === 'expense' ? transaction.amount : -transaction.amount
      await client.query('UPDATE savings SET balance = GREATEST(0, balance - $1) WHERE id = $2', [balanceChange, transaction.savings_id])
    }

    // Reverse Goal impact
    if (transaction.goal_id) {
      await client.query('UPDATE goals SET current_amount = GREATEST(0, current_amount - $1) WHERE id = $2', [transaction.amount, transaction.goal_id])
    }

    await client.query('COMMIT')

    res.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
})

// Get transaction analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const { period = '30d' } = req.query
    
    let dateFilter = ''
    switch (period) {
      case '7d':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '7 days'"
        break
      case '30d':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'"
        break
      case '90d':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '90 days'"
        break
      case '1y':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '1 year'"
        break
    }

    // Income vs Expenses
    const totalsResult = await pool.query(`
      SELECT 
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions 
      WHERE user_id = $1 ${dateFilter}
      GROUP BY type
    `, [req.user.id])

    // Spending by category
    const categoryResult = await pool.query(`
      SELECT 
        c.name,
        c.color,
        SUM(t.amount) as total,
        COUNT(t.*) as count
      FROM transactions t
      JOIN budget_categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.type = 'expense' ${dateFilter}
      GROUP BY c.id, c.name, c.color
      ORDER BY total DESC
    `, [req.user.id])

    // Daily spending trend
    const trendResult = await pool.query(`
      SELECT 
        transaction_date::date as date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM transactions 
      WHERE user_id = $1 ${dateFilter}
      GROUP BY transaction_date::date
      ORDER BY date
    `, [req.user.id])

    res.json({
      totals: totalsResult.rows,
      categories: categoryResult.rows,
      trend: trendResult.rows
    })
  } catch (error) {
    next(error)
  }
})

// Helper: normalize description for duplicate & manual-vs-statement reconciliation
function normalizeTxDesc(desc) {
  return String(desc || '')
    .toLowerCase()
    .replace(/\(card\s*\d+\)/gi, ' ')
    .replace(/\b(recurring\s+card\s+purchase|card\s+purchase|pos\s+purchase|eft\s+payment|immediate\s+payment|debit\s+order|debt\s+payment|bill\s+payment|savings\s+deposit|savings\s+withdrawal|payment\s+to|transfer\s+to|other\s+transport)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getDistinctTokens(desc) {
  const stop = new Set(['the', 'and', 'for', 'from', 'into', 'with', 'card', 'purchase', 'payment', 'paid', 'debit', 'credit', 'order', 'eft', 'pos', 'atm', 'zar', 'pty', 'ltd', 'south', 'africa'])
  return normalizeTxDesc(desc)
    .split(' ')
    .filter(w => w.length >= 3 && !stop.has(w) && !/^\d+$/.test(w))
}

function isReconciledDuplicate(incoming, existing) {
  if (incoming.type !== existing.type) return false
  const amtA = parseFloat(incoming.amount) || 0
  const amtB = parseFloat(existing.amount) || 0
  if (Math.abs(amtA - amtB) > 0.01) return false

  const dateA = new Date(incoming.transactionDate || incoming.transaction_date)
  const dateB = new Date(existing.transaction_date || existing.transactionDate)
  const diffDays = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24)

  const rawA = String(incoming.description || '').toLowerCase().trim()
  const rawB = String(existing.description || '').toLowerCase().trim()

  // 1. Exact or near-exact statement re-upload (same date or ±1 day + same description)
  if (diffDays <= 1 && (rawA === rawB || normalizeTxDesc(rawA) === normalizeTxDesc(rawB))) {
    return true
  }

  // 2. Manual entry <-> Bank Statement reconciliation within ±5 days:
  //    - Same linked entity (debt_id, bill_id, savings_id, goal_id), OR
  //    - Shared merchant/payee keyword (e.g. manual "Paid Maki" vs statement "Immediate Payment Maki"), OR
  //    - Exact same date + exact same amount + same type
  if (diffDays <= 5) {
    if (incoming.debtId && existing.debt_id && Number(incoming.debtId) === Number(existing.debt_id)) return true
    if (incoming.billId && existing.bill_id && Number(incoming.billId) === Number(existing.bill_id)) return true
    if (incoming.savingsId && existing.savings_id && Number(incoming.savingsId) === Number(existing.savings_id)) return true
    if (incoming.goalId && existing.goal_id && Number(incoming.goalId) === Number(existing.goal_id)) return true

    const tokensA = getDistinctTokens(rawA)
    const tokensB = getDistinctTokens(rawB)
    if (tokensA.length > 0 && tokensB.length > 0 && tokensA.some(t => tokensB.includes(t))) {
      return true
    }
  }

  // 3. Same day, exact same amount & type where one is a short manual note
  if (diffDays === 0 && (tokensOverlapOrShortManual(rawA, rawB))) {
    return true
  }

  return false
}

function tokensOverlapOrShortManual(rawA, rawB) {
  const normA = normalizeTxDesc(rawA)
  const normB = normalizeTxDesc(rawB)
  if (!normA || !normB) return true
  if (normA.includes(normB) || normB.includes(normA)) return true
  return false
}

// Bulk import transactions from CSV/PDF with automatic duplicate & manual-entry reconciliation
router.post('/import', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { transactions } = req.body

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions provided' })
    }

    if (transactions.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 transactions per import' })
    }

    // Get user's default account
    const accountResult = await client.query(
      'SELECT id FROM accounts WHERE user_id = $1 AND is_active = TRUE ORDER BY id ASC LIMIT 1',
      [req.user.id]
    )
    const accountId = accountResult.rows[0]?.id || null

    // Filter valid transactions first
    const validRaw = transactions.filter(tx => tx.type && tx.amount && tx.description && tx.transactionDate)
    const failed = transactions.length - validRaw.length

    if (validRaw.length === 0) {
      return res.json({ message: 'No valid transactions to import', imported: 0, skippedDuplicates: 0, failed })
    }

    // Fetch user's existing transactions to prevent duplicate imports & reconcile manual entries
    const existingRes = await client.query(
      `SELECT id, type, amount, transaction_date, description, debt_id, bill_id, savings_id, goal_id
       FROM transactions
       WHERE user_id = $1
       ORDER BY transaction_date DESC`,
      [req.user.id]
    )
    const existingPool = [...existingRes.rows]
    const usedExistingIds = new Set()

    const valid = []
    let skippedDuplicates = 0

    for (const tx of validRaw) {
      const matchIdx = existingPool.findIndex(
        ex => !usedExistingIds.has(ex.id) && isReconciledDuplicate(tx, ex)
      )
      if (matchIdx !== -1) {
        usedExistingIds.add(existingPool[matchIdx].id)
        skippedDuplicates++
      } else {
        valid.push(tx)
        // Also add to in-memory pool so identical duplicate rows inside the same broken upload don't double-insert
      }
    }

    if (valid.length === 0) {
      return res.json({
        message: `All ${skippedDuplicates} transaction(s) were already recorded — 0 duplicates imported.`,
        imported: 0,
        skippedDuplicates,
        failed,
        debtsUpdated: 0,
        billsPaid: 0,
        savingsUpdated: 0,
        goalsUpdated: 0
      })
    }

    await client.query('BEGIN')

    // Build a single batch INSERT including debt_id, savings_id, goal_id, bill_id
    const values = []
    const params = []
    valid.forEach((tx, i) => {
      const base = i * 11
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`)
      params.push(
        req.user.id,
        accountId,
        tx.type,
        parseFloat(tx.amount),
        String(tx.description).substring(0, 500),
        tx.transactionDate,
        tx.categoryId || null,
        tx.debtId || null,
        tx.savingsId || null,
        tx.goalId || null,
        tx.billId || null
      )
    })

    await client.query(
      `INSERT INTO transactions 
       (user_id, account_id, type, amount, description, transaction_date, category_id, debt_id, savings_id, goal_id, bill_id)
       VALUES ${values.join(', ')}`,
      params
    )

    if (accountId) {
      const netDelta = valid.reduce((acc, tx) => {
        const amt = parseFloat(tx.amount) || 0
        return acc + (tx.type === 'income' ? amt : -amt)
      }, 0)
      await client.query(
        'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [netDelta, accountId]
      )
    }

    // Apply automatic balance updates for linked Debts, Bills, Savings Pots, and Goals
    let debtsUpdated = 0
    let billsPaid = 0
    let savingsUpdated = 0
    let goalsUpdated = 0

    for (const tx of valid) {
      const amt = parseFloat(tx.amount) || 0
      if (amt <= 0) continue

      if (tx.debtId && tx.type === 'expense') {
        await client.query(
          'UPDATE debts SET balance = GREATEST(0, balance - $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
          [amt, tx.debtId, req.user.id]
        )
        debtsUpdated++
      }

      if (tx.savingsId) {
        const delta = tx.type === 'expense' ? amt : -amt
        await client.query(
          'UPDATE savings SET balance = GREATEST(0, balance + $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
          [delta, tx.savingsId, req.user.id]
        )
        savingsUpdated++
      }

      if (tx.goalId) {
        await client.query(
          `UPDATE goals 
           SET current_amount = current_amount + $1,
               is_achieved = CASE WHEN (current_amount + $1) >= target_amount THEN TRUE ELSE is_achieved END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND user_id = $3`,
          [amt, tx.goalId, req.user.id]
        )
        goalsUpdated++
      }

      if (tx.billId && tx.type === 'expense') {
        const billRes = await client.query(
          'SELECT * FROM bill_reminders WHERE id = $1 AND user_id = $2',
          [tx.billId, req.user.id]
        )
        if (billRes.rows.length > 0) {
          const bill = billRes.rows[0]
          if (bill.frequency) {
            const current = new Date(bill.due_date)
            if (bill.frequency === 'monthly') current.setMonth(current.getMonth() + 1)
            else if (bill.frequency === 'quarterly') current.setMonth(current.getMonth() + 3)
            else if (bill.frequency === 'yearly') current.setFullYear(current.getFullYear() + 1)
            const nextDueDate = current.toISOString().split('T')[0]
            await client.query(
              'UPDATE bill_reminders SET is_paid = FALSE, due_date = $1 WHERE id = $2 AND user_id = $3',
              [nextDueDate, tx.billId, req.user.id]
            )
          } else {
            await client.query(
              'UPDATE bill_reminders SET is_paid = TRUE WHERE id = $1 AND user_id = $2',
              [tx.billId, req.user.id]
            )
          }
          billsPaid++
        }
      }
    }

    await client.query('COMMIT')

    res.json({
      message: `Import complete: ${valid.length} imported, ${skippedDuplicates} duplicate(s) skipped`,
      imported: valid.length,
      skippedDuplicates,
      failed,
      debtsUpdated,
      billsPaid,
      savingsUpdated,
      goalsUpdated
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
})

// ─── POST /api/transactions/deduplicate (1-Click Cleanup of Duplicate Transactions) ───
router.post('/deduplicate', async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const allRes = await client.query(
      `SELECT id, account_id, debt_id, savings_id, goal_id, type, amount, transaction_date, description
       FROM transactions
       WHERE user_id = $1
       ORDER BY id ASC`,
      [req.user.id]
    )

    const kept = []
    const duplicateRows = []

    for (const row of allRes.rows) {
      const isDup = kept.some(k => isReconciledDuplicate(row, k))
      if (isDup) {
        duplicateRows.push(row)
      } else {
        kept.push(row)
      }
    }

    if (duplicateRows.length === 0) {
      await client.query('COMMIT')
      return res.json({ removed: 0, message: 'No duplicate transactions found!' })
    }

    const dupIds = duplicateRows.map(r => r.id)
    await client.query(
      'DELETE FROM transactions WHERE user_id = $1 AND id = ANY($2::int[])',
      [req.user.id, dupIds]
    )

    // Reverse balance impact of deleted duplicates
    for (const dup of duplicateRows) {
      const amt = parseFloat(dup.amount) || 0
      if (dup.account_id) {
        const delta = dup.type === 'income' ? -amt : amt
        await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [delta, dup.account_id])
      }
      if (dup.debt_id && dup.type === 'expense') {
        await client.query('UPDATE debts SET balance = balance + $1 WHERE id = $2', [amt, dup.debt_id])
      }
      if (dup.savings_id) {
        const delta = dup.type === 'expense' ? amt : -amt
        await client.query('UPDATE savings SET balance = GREATEST(0, balance - $1) WHERE id = $2', [delta, dup.savings_id])
      }
      if (dup.goal_id) {
        await client.query('UPDATE goals SET current_amount = GREATEST(0, current_amount - $1) WHERE id = $2', [amt, dup.goal_id])
      }
    }

    await client.query('COMMIT')
    res.json({
      removed: duplicateRows.length,
      message: `Removed ${duplicateRows.length} duplicate transaction(s) and reconciled balances!`
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
})

export default router
