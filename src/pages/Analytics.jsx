import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'
import { TrendingUp, TrendingDown, PieChart, BarChart3, Calendar } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Analytics() {
  const [period, setPeriod] = useState('30d')
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => (await analyticsAPI.getDashboard(period)).data,
  })

  const { data: insights } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => (await analyticsAPI.getInsights()).data,
  })

  if (isLoading) {
    return <LoadingSpinner text="Loading analytics..." />
  }

  const summary = dashboardData?.summary || {}
  const categories = dashboardData?.categories || []
  const dailyTrend = dashboardData?.dailyTrend || []
  const budgetPerformance = dashboardData?.budgetPerformance || []
  const insightsData = insights || {}

  const periodLabels = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year'
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Insights into your spending patterns and financial health</p>
        </div>
        
        <div className="period-selector">
          {Object.entries(periodLabels).map(([key, label]) => (
            <button
              key={key}
              className={`period-btn ${period === key ? 'active' : ''}`}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card">
          <div className="summary-icon income">
            <TrendingUp size={24} />
          </div>
          <div className="summary-content">
            <h3>Total Income</h3>
            <p className="summary-amount">{formatCurrency(summary.totalIncome || 0)}</p>
            <span className="summary-period">{periodLabels[period]}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon expense">
            <TrendingDown size={24} />
          </div>
          <div className="summary-content">
            <h3>Total Expenses</h3>
            <p className="summary-amount">{formatCurrency(summary.totalExpenses || 0)}</p>
            <span className="summary-period">{periodLabels[period]}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon net">
            <BarChart3 size={24} />
          </div>
          <div className="summary-content">
            <h3>Net Income</h3>
            <p className={`summary-amount ${summary.netIncome >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(summary.netIncome || 0)}
            </p>
            <span className="summary-period">{periodLabels[period]}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon savings">
            <PieChart size={24} />
          </div>
          <div className="summary-content">
            <h3>Savings Rate</h3>
            <p className="summary-amount">{summary.savingsRate || 0}%</p>
            <span className="summary-period">of income saved</span>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Spending by Category */}
        <div className="analytics-card">
          <div className="card-header">
            <h2>Spending by Category</h2>
            <span className="card-subtitle">{periodLabels[period]}</span>
          </div>
          <div className="category-chart">
            {categories.length > 0 ? (
              <div className="category-list">
                {categories.map((category, index) => {
                  const percentage = summary.totalExpenses > 0 
                    ? ((category.total / summary.totalExpenses) * 100).toFixed(1)
                    : 0
                  
                  return (
                    <div key={category.category} className="category-item">
                      <div className="category-info">
                        <div 
                          className="category-color"
                          style={{ backgroundColor: category.color || `hsl(${index * 45}, 70%, 50%)` }}
                        ></div>
                        <span className="category-name">{category.category}</span>
                      </div>
                      <div className="category-stats">
                        <span className="category-amount">{formatCurrency(category.total)}</span>
                        <span className="category-percentage">{percentage}%</span>
                      </div>
                      <div className="category-bar">
                        <div 
                          className="category-fill"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: category.color || `hsl(${index * 45}, 70%, 50%)`
                          }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-chart">
                <PieChart size={48} />
                <p>No spending data available for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Daily Trend */}
        <div className="analytics-card">
          <div className="card-header">
            <h2>Daily Spending Trend</h2>
            <span className="card-subtitle">{periodLabels[period]}</span>
          </div>
          <div className="trend-chart">
            {dailyTrend.length > 0 ? (
              <div className="trend-list">
                {dailyTrend.slice(-7).map(day => (
                  <div key={day.date} className="trend-item">
                    <div className="trend-date">
                      {new Date(day.date).toLocaleDateString('en-ZA', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="trend-bars">
                      <div className="trend-bar income">
                        <div 
                          className="bar-fill"
                          style={{ height: `${Math.max(5, (day.income / Math.max(...dailyTrend.map(d => Math.max(d.income, d.expenses)))) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="trend-bar expense">
                        <div 
                          className="bar-fill"
                          style={{ height: `${Math.max(5, (day.expenses / Math.max(...dailyTrend.map(d => Math.max(d.income, d.expenses)))) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="trend-amounts">
                      <span className="income">+{formatCurrency(day.income)}</span>
                      <span className="expense">-{formatCurrency(day.expenses)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-chart">
                <BarChart3 size={48} />
                <p>No trend data available for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Budget Performance */}
        <div className="analytics-card">
          <div className="card-header">
            <h2>Budget Performance</h2>
            <span className="card-subtitle">Current Month</span>
          </div>
          <div className="budget-performance">
            {budgetPerformance.length > 0 ? (
              <div className="budget-list">
                {budgetPerformance.map(budget => (
                  <div key={budget.id} className="budget-performance-item">
                    <div className="budget-info">
                      <span className="budget-name">{budget.name}</span>
                      <span className="budget-amounts">
                        {formatCurrency(budget.actual_spent)} / {formatCurrency(budget.monthly_limit)}
                      </span>
                    </div>
                    <div className="budget-progress">
                      <div className="progress-bar">
                        <div 
                          className={`progress-fill ${budget.percentage_used > 100 ? 'over-budget' : budget.percentage_used > 80 ? 'warning' : ''}`}
                          style={{ width: `${Math.min(budget.percentage_used, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`budget-percentage ${budget.percentage_used > 100 ? 'over-budget' : ''}`}>
                        {budget.percentage_used.toFixed(1)}%
                      </span>
                    </div>
                    {budget.percentage_used > 100 && (
                      <div className="over-budget-warning">
                        Over budget by {formatCurrency(budget.actual_spent - budget.monthly_limit)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-chart">
                <Calendar size={48} />
                <p>Set up budget categories to track performance</p>
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="analytics-card">
          <div className="card-header">
            <h2>Financial Insights</h2>
            <span className="card-subtitle">AI-powered recommendations</span>
          </div>
          <div className="insights-list">
            {/* Spending Pattern Insights */}
            {insightsData.topCategories?.length > 0 && (
              <div className="insight-item">
                <div className="insight-icon">📊</div>
                <div className="insight-content">
                  <h4>Top Spending Category</h4>
                  <p>
                    You spent the most on <strong>{insightsData.topCategories[0]?.name}</strong> 
                    ({formatCurrency(insightsData.topCategories[0]?.total)}) this month.
                  </p>
                </div>
              </div>
            )}

            {/* Savings Rate Insight */}
            {summary.savingsRate !== undefined && (
              <div className="insight-item">
                <div className="insight-icon">
                  {summary.savingsRate > 20 ? '🎉' : summary.savingsRate > 10 ? '👍' : '⚠️'}
                </div>
                <div className="insight-content">
                  <h4>Savings Rate</h4>
                  <p>
                    {summary.savingsRate > 20 
                      ? `Excellent! You're saving ${summary.savingsRate}% of your income.`
                      : summary.savingsRate > 10
                      ? `Good job! You're saving ${summary.savingsRate}% of your income. Try to reach 20%.`
                      : `Your savings rate is ${summary.savingsRate}%. Consider reducing expenses to save more.`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Budget Alerts */}
            {budgetPerformance.filter(b => b.percentage_used > 80).length > 0 && (
              <div className="insight-item warning">
                <div className="insight-icon">🚨</div>
                <div className="insight-content">
                  <h4>Budget Alert</h4>
                  <p>
                    You're close to or over budget in {budgetPerformance.filter(b => b.percentage_used > 80).length} categories. 
                    Consider adjusting your spending.
                  </p>
                </div>
              </div>
            )}

            {/* Spending Trend */}
            {dailyTrend.length >= 7 && (
              <div className="insight-item">
                <div className="insight-icon">📈</div>
                <div className="insight-content">
                  <h4>Spending Trend</h4>
                  <p>
                    {(() => {
                      const recent = dailyTrend.slice(-3).reduce((sum, day) => sum + day.expenses, 0) / 3
                      const previous = dailyTrend.slice(-7, -3).reduce((sum, day) => sum + day.expenses, 0) / 4
                      const change = ((recent - previous) / previous * 100).toFixed(1)
                      
                      if (Math.abs(change) < 5) {
                        return "Your spending has been consistent over the past week."
                      } else if (change > 0) {
                        return `Your daily spending increased by ${change}% compared to last week.`
                      } else {
                        return `Great! Your daily spending decreased by ${Math.abs(change)}% compared to last week.`
                      }
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* Default message if no insights */}
            {!insightsData.topCategories?.length && !dailyTrend.length && (
              <div className="insight-item">
                <div className="insight-icon">💡</div>
                <div className="insight-content">
                  <h4>Start Tracking</h4>
                  <p>Add more transactions to get personalized financial insights and recommendations.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
