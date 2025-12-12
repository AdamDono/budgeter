import { useQuery } from '@tanstack/react-query'
import { Calendar, CreditCard, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import { analyticsAPI, goalsAPI, transactionsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]
      return (await analyticsAPI.getDashboard('30d')).data
    },
  })

  const { data: recentTransactions } = useQuery({
    queryKey: ['transactions', { limit: 5 }],
    queryFn: async () => (await transactionsAPI.getAll({ limit: 5 })).data,
  })

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => (await goalsAPI.getAll()).data,
  })

  if (isLoading) {
    return <LoadingSpinner text="Loading dashboard..." />
  }

  const summary = dashboardData?.summary || {}
  const categories = dashboardData?.categories || []
  const budgetPerformance = dashboardData?.budgetPerformance || []

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Your financial overview</p>
        </div>
        <div className="month-selector">
          <Calendar size={18} />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-input"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card income">
          <div className="summary-icon">
            <TrendingUp size={24} />
          </div>
          <div className="summary-content">
            <h3>Total Income</h3>
            <p className="summary-amount">{formatCurrency(summary.totalIncome || 0)}</p>
          </div>
        </div>

        <div className="summary-card expense">
          <div className="summary-icon">
            <TrendingDown size={24} />
          </div>
          <div className="summary-content">
            <h3>Total Expenses</h3>
            <p className="summary-amount">{formatCurrency(summary.totalExpenses || 0)}</p>
          </div>
        </div>

        <div className="summary-card net">
          <div className="summary-icon">
            <CreditCard size={24} />
          </div>
          <div className="summary-content">
            <h3>Net Income</h3>
            <p className={`summary-amount ${summary.netIncome >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(summary.netIncome || 0)}
            </p>
          </div>
        </div>

        <div className="summary-card savings">
          <div className="summary-icon">
            <Target size={24} />
          </div>
          <div className="summary-content">
            <h3>Savings Rate</h3>
            <p className="summary-amount">{summary.savingsRate || 0}%</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Recent Transactions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Recent Transactions</h2>
            <a href="/transactions" className="view-all">View All</a>
          </div>
          <div className="transaction-list">
            {recentTransactions?.transactions?.slice(0, 5).map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-info">
                  <p className="transaction-description">{transaction.description}</p>
                  <p className="transaction-category">{transaction.category_name || 'Uncategorized'}</p>
                </div>
                <div className="transaction-amount">
                  <span className={`amount ${transaction.type}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                  <span className="transaction-date">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {(!recentTransactions?.transactions?.length) && (
              <div className="empty-state-improved">
                <div className="empty-icon">💳</div>
                <h3>No Transactions Yet</h3>
                <p>Start tracking your spending by adding your first transaction.</p>
                <div className="empty-tips">
                  <p><strong>💡 Quick Tip:</strong> Add both income and expenses to see your net income</p>
                  <p><strong>🎯 Pro Tip:</strong> Categorize transactions to track spending patterns</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Categories */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Top Spending Categories</h2>
          </div>
          <div className="category-list">
            {categories.slice(0, 5).map(category => (
              <div key={category.category} className="category-item">
                <div className="category-info">
                  <div 
                    className="category-color" 
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="category-name">{category.category}</span>
                </div>
                <div className="category-amount">
                  {formatCurrency(category.total)}
                </div>
              </div>
            ))}
            {!categories.length && (
              <p className="empty-state">No spending data available.</p>
            )}
          </div>
        </div>

        {/* Budget Performance */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Budget Performance</h2>
          </div>
          <div className="budget-list">
            {budgetPerformance.slice(0, 4).map(budget => (
              <div key={budget.id} className="budget-item">
                <div className="budget-info">
                  <span className="budget-name">{budget.name}</span>
                  <span className="budget-spent">
                    {formatCurrency(budget.actual_spent)} / {formatCurrency(budget.monthly_limit)}
                  </span>
                </div>
                <div className="budget-progress">
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${budget.percentage_used > 100 ? 'over-budget' : ''}`}
                      style={{ width: `${Math.min(budget.percentage_used, 100)}%` }}
                    ></div>
                  </div>
                  <span className={`budget-percentage ${budget.percentage_used > 100 ? 'over-budget' : ''}`}>
                    {budget.percentage_used}%
                  </span>
                </div>
              </div>
            ))}
            {!budgetPerformance.length && (
              <p className="empty-state">Set up budget categories to track performance.</p>
            )}
          </div>
        </div>

        {/* Goals Progress */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Goals Progress</h2>
            <a href="/goals" className="view-all">View All</a>
          </div>
          <div className="goals-list">
            {goals?.goals?.slice(0, 3).map(goal => (
              <div key={goal.id} className="goal-item">
                <div className="goal-info">
                  <span className="goal-name">{goal.name}</span>
                  <span className="goal-progress">
                    {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                  </span>
                </div>
                <div className="goal-progress-bar">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${goal.progress_percentage}%` }}
                    ></div>
                  </div>
                  <span className="goal-percentage">{goal.progress_percentage}%</span>
                </div>
              </div>
            ))}
            {(!goals?.goals?.length) && (
              <p className="empty-state">Create your first financial goal!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
