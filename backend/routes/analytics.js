import express from 'express'
import { pool } from '../database/connection.js'

const router = express.Router()

// Get comprehensive financial analytics
router.get('/dashboard', async (req, res, next) => {
  try {
    const { period = '30d' } = req.query
    
    let dateFilter = ''
    let dateInterval = ''
    
    switch (period) {
      case '7d':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '7 days'"
        dateInterval = '7 days'
        break
      case '30d':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'"
        dateInterval = '30 days'
        break
      case '90d':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '90 days'"
        dateInterval = '90 days'
        break
      case '1y':
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '1 year'"
        dateInterval = '1 year'
        break
      default:
        dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'"
        dateInterval = '30 days'
    }

    // 1. Account balances and net worth
    const accountsResult = await pool.query(`
      SELECT 
        at.name as account_type,
        SUM(a.balance) as total_balance,
        COUNT(a.id) as account_count
      FROM accounts a
      JOIN account_types at ON a.account_type_id = at.id
      WHERE a.user_id = $1 AND a.is_active = TRUE
      GROUP BY at.id, at.name
      ORDER BY total_balance DESC
    `, [req.user.id])

    // 2. Income vs Expenses summary
    const summaryResult = await pool.query(`
      SELECT 
        type,
        SUM(amount) as total,
        COUNT(*) as transaction_count,
        AVG(amount) as average_amount
      FROM transactions 
      WHERE user_id = $1 ${dateFilter}
      GROUP BY type
    `, [req.user.id])

    // 3. Category breakdown (expenses only)
    const categoryResult = await pool.query(`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category,
        COALESCE(c.color, '#6B7280') as color,
        SUM(t.amount) as total,
        COUNT(t.*) as transaction_count,
        ROUND(AVG(t.amount), 2) as average_amount
      FROM transactions t
      LEFT JOIN budget_categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.type = 'expense' ${dateFilter}
      GROUP BY c.id, c.name, c.color
      ORDER BY total DESC
      LIMIT 10
    `, [req.user.id])

    // 4. Daily spending trend
    const trendResult = await pool.query(`
      SELECT 
        transaction_date::date as date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net
      FROM transactions 
      WHERE user_id = $1 ${dateFilter}
      GROUP BY transaction_date::date
      ORDER BY date
    `, [req.user.id])

    // 5. Budget performance
    const budgetResult = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.monthly_limit,
        COALESCE(SUM(t.amount), 0) as actual_spent,
        c.monthly_limit - COALESCE(SUM(t.amount), 0) as remaining,
        CASE 
          WHEN c.monthly_limit > 0 THEN 
            ROUND((COALESCE(SUM(t.amount), 0) / c.monthly_limit * 100), 2)
          ELSE 0 
        END as percentage_used
      FROM budget_categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.user_id = $1 
        AND t.type = 'expense'
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
      WHERE c.user_id = $1 AND c.is_active = TRUE AND c.monthly_limit IS NOT NULL
      GROUP BY c.id, c.name, c.monthly_limit
      ORDER BY percentage_used DESC
    `, [req.user.id])

    // 6. Goal progress
    const goalsResult = await pool.query(`
      SELECT 
        id,
        name,
        target_amount,
        current_amount,
        CASE 
          WHEN target_amount > 0 THEN ROUND((current_amount / target_amount * 100), 2)
          ELSE 0
        END as progress_percentage,
        target_date,
        CASE 
          WHEN target_date IS NOT NULL THEN 
            (target_date::date - CURRENT_DATE)::integer
          ELSE NULL 
        END as days_remaining,
        is_achieved
      FROM goals
      WHERE user_id = $1
      ORDER BY progress_percentage DESC
    `, [req.user.id])

    // 7. Recent large transactions (top 5)
    const largeTransactionsResult = await pool.query(`
      SELECT 
        t.amount,
        t.description,
        t.transaction_date,
        t.type,
        COALESCE(c.name, 'Uncategorized') as category,
        a.name as account_name
      FROM transactions t
      LEFT JOIN budget_categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = $1 ${dateFilter}
      ORDER BY t.amount DESC
      LIMIT 5
    `, [req.user.id])

    // 8. Monthly comparison (current vs previous month)
    const monthlyComparisonResult = await pool.query(`
      SELECT 
        DATE_TRUNC('month', transaction_date) as month,
        type,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = $1 
        AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      GROUP BY DATE_TRUNC('month', transaction_date), type
      ORDER BY month, type
    `, [req.user.id])

    // Calculate insights
    const totalIncome = summaryResult.rows.find(r => r.type === 'income')?.total || 0
    const totalExpenses = summaryResult.rows.find(r => r.type === 'expense')?.total || 0
    const netIncome = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(1) : 0

    // Net worth calculation
    const netWorth = accountsResult.rows.reduce((sum, acc) => sum + parseFloat(acc.total_balance || 0), 0)

    res.json({
      period,
      summary: {
        netWorth,
        totalIncome,
        totalExpenses,
        netIncome,
        savingsRate: parseFloat(savingsRate),
        transactionCount: summaryResult.rows.reduce((sum, r) => sum + parseInt(r.transaction_count), 0)
      },
      accounts: accountsResult.rows,
      categories: categoryResult.rows,
      dailyTrend: trendResult.rows,
      budgetPerformance: budgetResult.rows,
      goals: goalsResult.rows,
      largeTransactions: largeTransactionsResult.rows,
      monthlyComparison: monthlyComparisonResult.rows,
      insights: generateInsights(summaryResult.rows, budgetResult.rows, goalsResult.rows, savingsRate)
    })
  } catch (error) {
    next(error)
  }
})

// Generate spending insights
router.get('/insights', async (req, res, next) => {
  try {
    // Top spending categories this month
    const topCategoriesResult = await pool.query(`
      SELECT 
        c.name,
        SUM(t.amount) as total,
        COUNT(t.*) as transaction_count
      FROM transactions t
      JOIN budget_categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND t.type = 'expense'
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 3
    `, [req.user.id])

    // Spending patterns by day of week
    const dayPatternResult = await pool.query(`
      SELECT 
        EXTRACT(dow FROM transaction_date) as day_of_week,
        TO_CHAR(transaction_date, 'Day') as day_name,
        AVG(amount) as avg_amount,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE user_id = $1 
        AND type = 'expense'
        AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY EXTRACT(dow FROM transaction_date), TO_CHAR(transaction_date, 'Day')
      ORDER BY day_of_week
    `, [req.user.id])

    // Unusual spending detection (transactions > 2 std deviations from mean)
    const unusualSpendingResult = await pool.query(`
      WITH stats AS (
        SELECT 
          AVG(amount) as mean_amount,
          STDDEV(amount) as std_amount
        FROM transactions
        WHERE user_id = $1 AND type = 'expense'
          AND transaction_date >= CURRENT_DATE - INTERVAL '90 days'
      )
      SELECT 
        t.amount,
        t.description,
        t.transaction_date,
        c.name as category
      FROM transactions t
      LEFT JOIN budget_categories c ON t.category_id = c.id
      CROSS JOIN stats s
      WHERE t.user_id = $1 
        AND t.type = 'expense'
        AND t.amount > (s.mean_amount + 2 * s.std_amount)
        AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY t.amount DESC
      LIMIT 5
    `, [req.user.id])

    res.json({
      topCategories: topCategoriesResult.rows,
      spendingByDay: dayPatternResult.rows,
      unusualSpending: unusualSpendingResult.rows
    })
  } catch (error) {
    next(error)
  }
})

// Helper function to generate insights
function generateInsights(summaryData, budgetData, goalsData, savingsRate) {
  const insights = []

  // Savings rate insight
  if (savingsRate > 20) {
    insights.push({
      type: 'positive',
      title: 'Great Savings Rate! 💰',
      message: `You're saving ${savingsRate}% of your income. Keep it up!`
    })
  } else if (savingsRate < 10) {
    insights.push({
      type: 'warning',
      title: 'Low Savings Rate ⚠️',
      message: `You're only saving ${savingsRate}% of your income. Consider reducing expenses.`
    })
  }

  // Budget alerts
  const overBudgetCategories = budgetData.filter(b => b.percentage_used > 100)
  if (overBudgetCategories.length > 0) {
    insights.push({
      type: 'alert',
      title: 'Budget Exceeded! 🚨',
      message: `You've exceeded your budget in ${overBudgetCategories.length} categories.`
    })
  }

  // Goal progress
  const achievedGoals = goalsData.filter(g => g.is_achieved).length
  if (achievedGoals > 0) {
    insights.push({
      type: 'positive',
      title: 'Goals Achieved! 🎉',
      message: `You've completed ${achievedGoals} financial goals. Great work!`
    })
  }

  return insights
}

export default router
