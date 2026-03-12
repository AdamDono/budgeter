import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'
import { TrendingUp, TrendingDown, AlertCircle, Target, BarChart3, PieChart, Activity } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Trends() {
  const [period, setPeriod] = useState('6m')

  const { data: trendsData, isLoading } = useQuery({
    queryKey: ['trends', period],
    queryFn: async () => {
      const response = await analyticsAPI.getDashboard('1y')
      return response.data
    },
  })

  if (isLoading) {
    return <LoadingSpinner text="Analyzing spending patterns..." />
  }

  const dailyTrend = trendsData?.dailyTrend || []
  const categories = trendsData?.categories || []

  // Ensure parsing to avoid NaNs
  const getValidExpense = (d) => parseFloat(d.expenses) || 0

  // Calculate trend metrics
  const calculateTrend = (data) => {
    if (data.length < 2) return 0
    const recent = data.slice(-7).reduce((sum, d) => sum + getValidExpense(d), 0) / 7
    const previous = Math.max(1, data.slice(-14, -7).length)
    const prevItems = data.slice(-14, -7)
    
    const prevSum = prevItems.reduce((sum, d) => sum + getValidExpense(d), 0) / previous
    if (prevSum === 0) return recent > 0 ? 100 : 0
    return (((recent - prevSum) / prevSum) * 100).toFixed(1)
  }

  // Forecast next month spending
  const forecastSpending = () => {
    if (dailyTrend.length === 0) return 0
    const totalExpenses = dailyTrend.reduce((sum, d) => sum + getValidExpense(d), 0)
    const avgDaily = totalExpenses / dailyTrend.length
    return (avgDaily * 30).toFixed(2)
  }

  const getCategoryTrend = (categoryName) => {
    // A more advanced category trend approximation since daily category data may be sparse
    const categoryData = dailyTrend
      .filter(d => {
        // This assumes backend sends breakdown. If not, safe fallback calculation.
        return d.category === categoryName
      })
      .map(d => getValidExpense(d))
    
    if (categoryData.length < 2) return 0
    const recent = categoryData.slice(-7).reduce((a, b) => a + b, 0) / 7
    const previous = categoryData.slice(-14, -7).reduce((a, b) => a + b, 0) / 7 || 1
    
    return (((recent - previous) / previous) * 100).toFixed(1)
  }

  const spendingTrend = calculateTrend(dailyTrend)
  const forecast = forecastSpending()
  const dailyAvg = dailyTrend.length > 0 
    ? (dailyTrend.reduce((sum, d) => sum + getValidExpense(d), 0) / dailyTrend.length).toFixed(2)
    : 0

  const maxExpenseDay = dailyTrend.length > 0
    ? Math.max(...dailyTrend.map(d => getValidExpense(d)))
    : 0

  const periodLabels = {
    '1m': '1 Month',
    '3m': '3 Months',
    '6m': '6 Months',
    '1y': '1 Year'
  }

  return (
    <div className="trends-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info">
          <h1>Spending Trends & Forecasts</h1>
          <p className="text-muted">High-fidelity analysis of your financial trajectories</p>
        </div>
        
        <div className="period-selector glass-panel" style={{ padding: '0.25rem', borderRadius: '12px', display: 'flex', gap: '0.25rem' }}>
          {Object.entries(periodLabels).map(([key, label]) => (
            <button
              key={key}
              className={`btn ${period === key ? 'primary' : 'ghost'} extra-small`}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* High-Fidelity Intel Row */}
      <div className="analytics-summary-stats">
        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <Activity size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label">Spending Trend</span>
            <span className={`intel-value ${spendingTrend > 0 ? 'text-danger' : 'text-positive'}`}>
              {spendingTrend > 0 ? '+' : ''}{spendingTrend}%
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>vs last period</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <Target size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label">Forecasted Monthly</span>
            <span className="intel-value">{formatCurrency(forecast)}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Predicted next 30 days</span>
          </div>
        </div>

        <div className="intel-block glass-panel highlight" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <TrendingDown size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label">Daily Average</span>
            <span className="intel-value">{formatCurrency(dailyAvg)}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Average daily spend</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <AlertCircle size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label">Peak Spending Day</span>
            <span className="intel-value">{formatCurrency(maxExpenseDay)}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Highest single day recorded</span>
          </div>
        </div>
      </div>

      <div className="goals-glass-grid" style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem' }}>
        
        {/* Daily Spending Pattern Overview */}
        <div className="analytics-glass-card shadow-2xl">
          <div className="card-v2-header">
            <div>
              <span className="card-v2-subtitle">Velocity Overview</span>
              <h2>Daily Spending Pattern</h2>
            </div>
            <div className="pot-yield-badge"><BarChart3 size={14} /> Last 30 Days</div>
          </div>

          <div className="trend-high-fidelity" style={{ height: '200px', padding: '0 0.5rem', marginTop: '1rem', gap: '8px' }}>
            {dailyTrend.slice(-30).map((day, i) => {
              const maxVal = Math.max(...dailyTrend.slice(-30).map(d => getValidExpense(d)))
              const expenseValue = getValidExpense(day)
              const expenseH = (expenseValue / (maxVal || 1)) * 100

              return (
                <div key={i} className="premium-bar-group" style={{ flex: 1 }}>
                  <div className="bar-stack" style={{ justifyContent: 'flex-end' }}>
                    <div 
                      className="bar-indicator premium-bar-hover" 
                      style={{ 
                        height: `${Math.max(2, expenseH)}%`, 
                        backgroundColor: '#ef4444', 
                        opacity: 0.8,
                        boxShadow: `0 0 10px rgba(239, 68, 68, 0.2)`,
                        transition: 'all 0.3s ease',
                      }} 
                      title={`${new Date(day.date).toLocaleDateString()}: ${formatCurrency(expenseValue)}`}
                    />
                  </div>
                  {i % 3 === 0 && (
                    <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '700', marginTop: '0.5rem' }}>
                      {new Date(day.date).toLocaleDateString('en-ZA', { day: '2-digit' })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="goals-glass-grid" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Category Trends Subgrid */}
        <div className="analytics-glass-card shadow-2xl">
          <div className="card-v2-header">
            <div>
              <span className="card-v2-subtitle">Deep Dive</span>
              <h2>Category Vectors</h2>
            </div>
            <div className="pot-yield-badge"><PieChart size={14} /> Breakdown</div>
          </div>

          <div className="category-trend-grid-v2">
            {categories.slice(0, 8).map((category, index) => {
              const trend = getCategoryTrend(category.category) || 0
              const isIncrease = trend > 0
              return (
                <div key={category.category} className="trend-category-panel glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div 
                        style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: category.color || `hsl(${index * 45}, 70%, 50%)`, boxShadow: `0 0 10px ${category.color || `hsl(${index * 45}, 70%, 50%)`}` }}
                      ></div>
                      <div>
                        <span style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '0.9rem', display: 'block' }}>{category.category}</span>
                        <span style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '0.8rem' }}>{formatCurrency(category.total)}</span>
                      </div>
                    </div>
                    
                    <div className={`trend-flare ${isIncrease ? 'danger' : 'success'}`}>
                      {isIncrease ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span>{Math.abs(trend)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}
