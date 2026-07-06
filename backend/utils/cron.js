import cron from 'node-cron'
import { pool } from '../database/connection.js'
import { sendBillReminderEmail, sendBudgetAlertEmail, sendMonthlySummaryEmail } from './mailer.js'

// ─── ① Bill Due Reminders - runs daily at 8:00 AM ──────────────────────────────
// For each user, find unpaid bills that are due in exactly `reminder_days` days.
// Groups multiple bills into a single email per user.
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

      // Group bills by user
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

      // Send one email per user
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

// ─── ③ Monthly Summary - runs on 1st of every month at 9:00 AM ─────────────────
// Sends previous month's income/expense/goal summary to all users with monthly_report = true
export function startMonthlySummaryCron() {
  cron.schedule('0 9 1 * *', async () => {
    console.log('⏰ [CRON] Running monthly summary emails...')
    try {
      // Previous month
      const now = new Date()
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()       // 1-indexed
      const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

      // Get all users who have monthly_report enabled
      const usersResult = await pool.query(`
        SELECT u.id, u.email, u.first_name
        FROM users u
        JOIN user_settings s ON u.id = s.user_id
        WHERE s.monthly_report = TRUE
      `)

      for (const user of usersResult.rows) {
        try {
          // Income & expenses last month
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

          // Top spending categories last month
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

          // Active goals count
          const goalsResult = await pool.query(
            'SELECT COUNT(*) AS count FROM goals WHERE user_id = $1 AND status = $2',
            [user.id, 'active']
          )

          // Skip if no activity at all
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
            goalsCount:     parseInt(goalsResult.rows[0].count),
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
  startMonthlySummaryCron()
}
