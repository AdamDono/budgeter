import cron from 'node-cron'
import { pool } from '../database/connection.js'
import { 
  sendBillReminderEmail, 
  sendBudgetAlertEmail, 
  sendMonthlySummaryEmail,
  sendSundayPulseEmail,
  sendInactivityReEngagementEmail
} from './mailer.js'

// ─── ① Bill Due Reminders - runs daily at 8:00 AM ──────────────────────────────
export function startBillReminderCron() {
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ [CRON] Running bill due reminders...')
    try {
      const result = await pool.query(`
        SELECT
          u.id AS user_id,
          u.email,
          u.first_name,
          b.id AS bill_id,
          b.name,
          b.amount,
          b.due_date,
          b.reminder_days,
          (b.due_date - CURRENT_DATE) AS days_until_due
        FROM bill_reminders b
        JOIN users u ON b.user_id = u.id
        JOIN user_settings s ON u.id = s.user_id
        WHERE b.is_paid = FALSE
          AND s.notifications_enabled = TRUE
          AND (b.due_date - CURRENT_DATE) = b.reminder_days
        ORDER BY u.id
      `)

      if (result.rows.length === 0) {
        console.log('✅ [CRON] No bill reminders to send today.')
        return
      }

      const byUser = {}
      for (const row of result.rows) {
        if (!byUser[row.user_id]) {
          byUser[row.user_id] = { email: row.email, firstName: row.first_name, bills: [] }
        }
        byUser[row.user_id].bills.push({
          name:           row.name,
          amount:         row.amount,
          due_date:       row.due_date,
          days_until_due: parseInt(row.days_until_due),
        })
      }

      for (const [userId, { email, firstName, bills }] of Object.entries(byUser)) {
        try {
          await sendBillReminderEmail(email, firstName, bills)
          console.log(`✅ [CRON] Bill reminder sent to ${email} (${bills.length} bill${bills.length > 1 ? 's' : ''})`)
        } catch (err) {
          console.error(`❌ [CRON] Failed bill reminder for user ${userId}:`, err.message)
        }
      }
    } catch (err) {
      console.error('❌ [CRON] Bill reminder cron error:', err.message)
    }
  }, { timezone: 'Africa/Johannesburg' })

  console.log('📅 Bill reminder cron scheduled (daily 08:00 SAST)')
}

// ─── ② Sunday Evening Financial Pulse - runs every Sunday at 18:00 (6:00 PM SAST) ──
export function startSundayPulseCron() {
  cron.schedule('0 18 * * 0', async () => {
    console.log('⏰ [CRON] Running Sunday Financial Pulse emails...')
    try {
      const usersResult = await pool.query(`
        SELECT u.id, u.email, u.first_name
        FROM users u
        LEFT JOIN user_settings s ON u.id = s.user_id
        WHERE s.notifications_enabled IS NULL OR s.notifications_enabled = TRUE
      `)

      for (const user of usersResult.rows) {
        try {
          // 1. Spend in the last 7 days
          const weekSpendRes = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) AS week_spend
            FROM transactions
            WHERE user_id = $1 AND type = 'expense'
              AND transaction_date >= CURRENT_DATE - INTERVAL '7 days'
          `, [user.id])
          const weekSpend = parseFloat(weekSpendRes.rows[0]?.week_spend || 0)

          // 2. Monthly budget comparison
          const budgetRes = await pool.query(`
            SELECT 
              COALESCE(SUM(monthly_limit), 0) AS total_limit,
              COALESCE(SUM(t_spent.spent), 0) AS total_spent
            FROM budget_categories c
            LEFT JOIN (
              SELECT category_id, SUM(amount) AS spent
              FROM transactions
              WHERE user_id = $1 AND type = 'expense' 
                AND transaction_date >= date_trunc('month', CURRENT_DATE)
              GROUP BY category_id
            ) t_spent ON c.id = t_spent.category_id
            WHERE c.user_id = $1
          `, [user.id])
          
          const totalLimit = parseFloat(budgetRes.rows[0]?.total_limit || 0)
          const totalSpent = parseFloat(budgetRes.rows[0]?.total_spent || 0)

          let budgetPaceText = 'Pacing steadily for this month'
          let isUnderBudget = true

          if (totalLimit > 0) {
            const pct = Math.round((totalSpent / totalLimit) * 100)
            const dayOfMonth = new Date().getDate()
            const expectedPct = Math.round((dayOfMonth / 30) * 100)

            if (pct <= expectedPct) {
              const diff = expectedPct - pct
              budgetPaceText = diff > 0 ? `You stayed ${diff}% under your expected monthly pace! 👏` : 'You are right on track with your monthly budget!'
              isUnderBudget = true
            } else {
              const over = pct - expectedPct
              budgetPaceText = `You are ${over}% ahead of your expected spend pace. Look for small cuts this week.`
              isUnderBudget = false
            }
          }

          // 3. Upcoming bills next 7 days
          const billsRes = await pool.query(`
            SELECT name, amount, due_date
            FROM bill_reminders
            WHERE user_id = $1 AND is_paid = FALSE
              AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days'
            ORDER BY due_date ASC
            LIMIT 5
          `, [user.id])

          // 4. Debts and Goals status
          const debtsRes = await pool.query(
            'SELECT COUNT(*) AS count FROM debts WHERE user_id = $1 AND balance > 0',
            [user.id]
          )
          const debtsCount = parseInt(debtsRes.rows[0]?.count || 0)

          // 5. AI Tip
          const aiTip = isUnderBudget
            ? 'Great job keeping expenses tight. Consider routing your weekly surplus into your highest interest debt or savings pot.'
            : 'Check your upcoming bills and prioritize essential living expenses before discretionary treats this week.'

          await sendSundayPulseEmail(user.email, user.first_name, {
            weekSpend,
            budgetPaceText,
            isUnderBudget,
            upcomingBills: billsRes.rows,
            debtsCount,
            aiTip
          })
          console.log(`✅ [CRON] Sunday Pulse sent to ${user.email}`)
        } catch (err) {
          console.error(`❌ [CRON] Sunday Pulse failed for ${user.email}:`, err.message)
        }
      }
    } catch (err) {
      console.error('❌ [CRON] Sunday Pulse cron error:', err.message)
    }
  }, { timezone: 'Africa/Johannesburg' })

  console.log('📅 Sunday Financial Pulse cron scheduled (every Sunday 18:00 SAST)')
}

// ─── ③ 30-Day Inactivity Check-in - runs every Monday at 10:00 AM SAST ─────────
export function startInactivityCheckCron() {
  cron.schedule('0 10 * * 1', async () => {
    console.log('⏰ [CRON] Running 30-day inactivity check-in emails...')
    try {
      // Find users with no transaction or login activity in the past 30 days
      const inactiveUsers = await pool.query(`
        SELECT u.id, u.email, u.first_name,
               COALESCE(MAX(t.transaction_date), u.created_at) AS last_active
        FROM users u
        LEFT JOIN transactions t ON u.id = t.user_id
        LEFT JOIN user_settings s ON u.id = s.user_id
        WHERE s.notifications_enabled IS NULL OR s.notifications_enabled = TRUE
        GROUP BY u.id, u.email, u.first_name, u.created_at
        HAVING COALESCE(MAX(t.transaction_date), u.created_at) <= CURRENT_DATE - INTERVAL '30 days'
      `)

      for (const user of inactiveUsers.rows) {
        try {
          const debtsRes = await pool.query(
            'SELECT COUNT(*) AS count, COALESCE(SUM(balance), 0) AS total FROM debts WHERE user_id = $1 AND balance > 0',
            [user.id]
          )
          const goalsRes = await pool.query(
            'SELECT COUNT(*) AS count FROM goals WHERE user_id = $1 AND is_achieved = FALSE',
            [user.id]
          )

          const activeDebtsCount = parseInt(debtsRes.rows[0]?.count || 0)
          const totalDebt = parseFloat(debtsRes.rows[0]?.total || 0)
          const goalsCount = parseInt(goalsRes.rows[0]?.count || 0)

          await sendInactivityReEngagementEmail(user.email, user.first_name, {
            activeDebtsCount,
            totalDebt,
            goalsCount
          })
          console.log(`✅ [CRON] Inactivity check-in sent to ${user.email}`)
        } catch (err) {
          console.error(`❌ [CRON] Inactivity check-in failed for ${user.email}:`, err.message)
        }
      }
    } catch (err) {
      console.error('❌ [CRON] Inactivity check-in cron error:', err.message)
    }
  }, { timezone: 'Africa/Johannesburg' })

  console.log('📅 30-Day Inactivity Check-in cron scheduled (Mondays 10:00 SAST)')
}

// ─── ④ Monthly Summary - runs on 1st of every month at 9:00 AM ─────────────────
export function startMonthlySummaryCron() {
  cron.schedule('0 9 1 * *', async () => {
    console.log('⏰ [CRON] Running monthly summary emails...')
    try {
      const now = new Date()
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
      const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

      const usersResult = await pool.query(`
        SELECT u.id, u.email, u.first_name
        FROM users u
        JOIN user_settings s ON u.id = s.user_id
        WHERE s.monthly_report = TRUE
      `)

      for (const user of usersResult.rows) {
        try {
          const summaryResult = await pool.query(`
            SELECT
              COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses
            FROM transactions
            WHERE user_id = $1
              AND EXTRACT(MONTH FROM transaction_date) = $2
              AND EXTRACT(YEAR  FROM transaction_date) = $3
          `, [user.id, prevMonth, prevYear])

          const { total_income, total_expenses } = summaryResult.rows[0]
          const income   = parseFloat(total_income)
          const expenses = parseFloat(total_expenses)
          const netSavings = income - expenses
          const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0

          const catResult = await pool.query(`
            SELECT
              COALESCE(c.name, 'Uncategorized') AS category,
              SUM(t.amount) AS total
            FROM transactions t
            LEFT JOIN budget_categories c ON t.category_id = c.id
            WHERE t.user_id = $1
              AND t.type = 'expense'
              AND EXTRACT(MONTH FROM transaction_date) = $2
              AND EXTRACT(YEAR  FROM transaction_date) = $3
            GROUP BY c.name
            ORDER BY total DESC
            LIMIT 5
          `, [user.id, prevMonth, prevYear])

          const goalsResult = await pool.query(
            'SELECT COUNT(*) AS count FROM goals WHERE user_id = $1 AND is_achieved = FALSE',
            [user.id]
          )

          if (income === 0 && expenses === 0) {
            console.log(`⏭  [CRON] Skipping monthly summary for ${user.email}, no transactions last month`)
            continue
          }

          await sendMonthlySummaryEmail(user.email, user.first_name, {
            month:          prevMonth,
            year:           prevYear,
            totalIncome:    income,
            totalExpenses:  expenses,
            netSavings,
            savingsRate,
            topCategories:  catResult.rows,
            goalsCount:     parseInt(goalsResult.rows[0]?.count || 0),
          })
          console.log(`✅ [CRON] Monthly summary sent to ${user.email}`)
        } catch (err) {
          console.error(`❌ [CRON] Monthly summary failed for ${user.email}:`, err.message)
        }
      }
    } catch (err) {
      console.error('❌ [CRON] Monthly summary cron error:', err.message)
    }
  }, { timezone: 'Africa/Johannesburg' })

  console.log('📅 Monthly summary cron scheduled (1st of month 09:00 SAST)')
}

export function startAllCrons() {
  startBillReminderCron()
  startSundayPulseCron()
  startInactivityCheckCron()
  startMonthlySummaryCron()
}
