import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'
import { TrendingUp, TrendingDown, AlertCircle, Target } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Trends() {
  const [period, setPeriod] = useState('6m')

  const { data: trendsData, isLoading } = useQuery({
    queryKey: ['trends', period],
    queryFn: async () => {
      // Fetch analytics data for trend analysis
      const response = await analyticsAPI.getDashboard('1y')
      return response.data
    },
  })

  if (isLoading) {
    return <LoadingSpinner text="Analyzing spending trends..." />
  }

  const dailyTrend = trendsData?.dailyTrend || []
  const categories = trendsData?.categories || []

  // Calculate trend metrics
  const calculateTrend = (data) => {
    if (data.length < 2) return 0
    const recent = data.slice(-7).reduce((sum, d) => sum + d.expenses, 0) / 7
    const previous = data.slice(-14, -7).reduce((sum, d) => sum + d.expenses, 0) / 7
    return ((recent - previous) / previous * 100).toFixed(1)
  }

  // Forecast next month spending
  const forecastSpending = () => {
    if (dailyTrend.length === 0) return 0
    const avgDaily = dailyTrend.reduce((sum, d) => sum + d.expenses, 0) / dailyTrend.length
    return (avgDaily * 30).toFixed(2)
  }

  // Category trends
  const getCategoryTrend = (categoryName) => {
    const categoryData = dailyTrend
      .filter(d => d.category === categoryName)
      .map(d => d.expenses)
    
    if (categoryData.length < 2) return 0
    const recent = categoryData.slice(-7).reduce((a, b) => a + b, 0) / 7
    const previous = categoryData.slice(-14, -7).reduce((a, b) => a + b, 0) / 7
    return ((recent - previous) / previous * 100).toFixed(1)
  }

  const spendingTrend = calculateTrend(dailyTrend)
  const forecast = forecastSpending()

  return (
    <div className="trends-page">
      <div className="page-header">
        <div>
          <h1>Spending Trends & Forecasts</h1>
          <p>Analyze your spending patterns and predict future expenses</p>
        </div>
        <div className="period-selector">
          {['1m', '3m', '6m', '1y'].map(p => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === '1m' ? '1 Month' : p === '3m' ? '3 Months' : p === '6m' ? '6 Months' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon trending">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <h3>Spending Trend</h3>
            <p className={`metric-value ${spendingTrend >= 0 ? 'negative' : 'positive'}`}>
              {spendingTrend >= 0 ? '+' : ''}{spendingTrend}%
            </p>
            <span className="metric-label">
              {spendingTrend >= 0 ? 'Spending increased' : 'Spending decreased'} vs last period
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon forecast">
            <Target size={24} />
          </div>
          <div className="metric-content">
            <h3>Forecasted Monthly</h3>
            <p className="metric-value">{formatCurrency(forecast)}</p>
            <span className="metric-label">Predicted spending for next month</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon average">
            <TrendingDown size={24} />
          </div>
          <div className="metric-content">
            <h3>Daily Average</h3>
            <p className="metric-value">
              {formatCurrency(
                dailyTrend.length > 0 
                  ? (dailyTrend.reduce((sum, d) => sum + d.expenses, 0) / dailyTrend.length).toFixed(2)
                  : 0
              )}
            </p>
            <span className="metric-label">Average daily spending</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon alert">
            <AlertCircle size={24} />
          </div>
          <div className="metric-content">
            <h3>Highest Spending Day</h3>
            <p className="metric-value">
              {dailyTrend.length > 0
                ? formatCurrency(Math.max(...dailyTrend.map(d => d.expenses)))
                : 'N/A'
              }
            </p>
            <span className="metric-label">Peak daily spending</span>
          </div>
        </div>
      </div>

      {/* Spending Chart */}
      <div className="trends-section">
        <div className="section-header">
          <h2>Daily Spending Pattern</h2>
          <span className="section-subtitle">Last 30 days</span>
        </div>
        <div className="chart-container">
          <div className="spending-chart">
            {dailyTrend.slice(-30).map((day, idx) => {
              const maxSpend = Math.max(...dailyTrend.slice(-30).map(d => d.expenses))
              const height = (day.expenses / maxSpend * 100) || 5
              return (
                <div key={idx} className="chart-bar">
                  <div
                    className="bar-fill"
                    style={{ height: `${height}%` }}
                    title={`${new Date(day.date).toLocaleDateString()}: ${formatCurrency(day.expenses)}`}
                  ></div>
                  <span className="bar-label">
                    {new Date(day.date).toLocaleDateString('en-ZA', { day: 'numeric' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Category Trends */}
      <div className="trends-section">
        <div className="section-header">
          <h2>Category Trends</h2>
          <span className="section-subtitle">Spending by category</span>
        </div>
        <div className="category-trends">
          {categories.slice(0, 8).map(category => {
            const trend = getCategoryTrend(category.category)
            return (
              <div key={category.category} className="category-trend-item">
                <div className="category-info">
                  <div
                    className="category-dot"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <div className="category-details">
                    <h4>{category.category}</h4>
                    <p>{formatCurrency(category.total)}</p>
                  </div>
                </div>
                <div className={`trend-indicator ${trend >= 0 ? 'up' : 'down'}`}>
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="trends-section">
        <div className="section-header">
          <h2>Smart Insights</h2>
        </div>
        <div className="insights-list">
          {spendingTrend > 10 && (
            <div className="insight-item warning">
              <AlertCircle size={20} />
              <div>
                <h4>Spending Alert</h4>
                <p>Your spending increased by {spendingTrend}% compared to last period. Consider reviewing your expenses.</p>
              </div>
            </div>
          )}

          {spendingTrend < -10 && (
            <div className="insight-item positive">
              <TrendingDown size={20} />
              <div>
                <h4>Great Job!</h4>
                <p>Your spending decreased by {Math.abs(spendingTrend)}% compared to last period. Keep it up!</p>
              </div>
            </div>
          )}

          <div className="insight-item info">
            <Target size={20} />
            <div>
              <h4>Monthly Forecast</h4>
              <p>Based on your spending patterns, you're projected to spend {formatCurrency(forecast)} next month.</p>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="insight-item info">
              <TrendingUp size={20} />
              <div>
                <h4>Top Spending Category</h4>
                <p>{categories[0].category} is your highest spending category at {formatCurrency(categories[0].total)}.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
