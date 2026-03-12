import { useQuery } from '@tanstack/react-query'
import { BarChart3, Calendar, PieChart, TrendingDown, TrendingUp, Sparkles, Target, Zap, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'
import ForexWidget from '../components/ForexWidget'
import LoadingSpinner from '../components/LoadingSpinner'
import { analyticsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Analytics() {
  const [period, setPeriod] = useState('30d')
  
  const [trendView, setTrendView] = useState('weekly')
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => (await analyticsAPI.getDashboard(period)).data,
  })

  const { data: insights } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => (await analyticsAPI.getInsights()).data,
  })

  if (isLoading) {
    return <LoadingSpinner text="Analyzing financial protocols..." />
  }

  const summary = dashboardData?.summary || {}
  const categories = dashboardData?.categories || []
  const dailyTrend = dashboardData?.dailyTrend || []
  const budgetPerformance = dashboardData?.budgetPerformance || []
  const insightsData = insights || {}

  const trendData = trendView === 'weekly' 
    ? dailyTrend.slice(-7) 
    : (() => {
        const monthlyMap = dailyTrend.reduce((acc, day) => {
          const date = new Date(day.date)
          const monthKey = date.toLocaleString('en-ZA', { month: 'short', year: 'numeric' })
          if (!acc[monthKey]) {
            acc[monthKey] = { label: date.toLocaleString('en-ZA', { month: 'short' }), income: 0, expenses: 0, timestamp: date.getTime() }
          }
          acc[monthKey].income += parseFloat(day.income) || 0
          acc[monthKey].expenses += parseFloat(day.expenses) || 0
          return acc
        }, {})
        return Object.values(monthlyMap).sort((a, b) => a.timestamp - b.timestamp).slice(-3)
      })()

  const periodLabels = {
    '7d': '7D',
    '30d': '30D',
    '90d': '90D',
    '1y': '1Y'
  }

  const fullPeriodLabels = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year'
  }

  return (
    <div className="analytics-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info">
          <h1>Tactical Analytics</h1>
          <p className="text-muted">High-fidelity insights into your financial behavior</p>
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

      {/* High-Fidelity Summary Row */}
      <div className="analytics-summary-stats">
        <div className="intel-block glass-panel highlight" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <TrendingUp size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label">Total Inflow</span>
            <span className="intel-value">{formatCurrency(summary.totalIncome || 0)}</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <TrendingDown size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label">Total Outflow</span>
            <span className="intel-value">{formatCurrency(summary.totalExpenses || 0)}</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <Zap size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label">Net Delta</span>
            <span className={`intel-value ${summary.netIncome >= 0 ? 'text-positive' : 'text-danger'}`}>
              {formatCurrency(summary.netIncome || 0)}
            </span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <PieChart size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label">Savings Velocity</span>
            <span className="intel-value">{summary.savingsRate || 0}%</span>
          </div>
        </div>
      </div>

      <div className="goals-glass-grid" style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Spending by Category */}
        <div className="analytics-glass-card shadow-2xl">
          <div className="card-v2-header">
            <div>
              <span className="card-v2-subtitle">Distribution</span>
              <h2>Spending by Category</h2>
            </div>
            <div className="pot-yield-badge"><PieChart size={14} /> Global</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {categories.length > 0 ? (
              categories.map((category, index) => {
                const percentage = summary.totalExpenses > 0 
                  ? ((category.total / summary.totalExpenses) * 100).toFixed(1)
                  : 0
                
                return (
                  <div key={category.category} className="spending-category-row">
                    <div className="category-row-info">
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div 
                          style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: category.color || `hsl(${index * 45}, 70%, 50%)` }}
                        ></div>
                        <span style={{ fontWeight: '600', color: '#f1f5f9', fontSize: '0.9rem' }}>{category.category}</span>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'white' }}>{formatCurrency(category.total)}</span>
                    </div>
                    <div className="premium-progress-container" style={{ height: '6px' }}>
                      <div 
                        className="premium-progress-fill"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: category.color || `hsl(${index * 45}, 70%, 50%)`,
                          boxShadow: `0 0 10px ${category.color || `hsl(${index * 45}, 70%, 50%)`}40`
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.7rem', color: '#64748b' }}>
                      {percentage}% of total
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-state-pot" style={{ padding: '2rem' }}>
                <PieChart size={32} />
                <p>No distribution data available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Daily Spending Trend */}
        <div className="analytics-glass-card shadow-2xl">
          <div className="card-v2-header">
            <div>
              <span className="card-v2-subtitle">Velocity</span>
              <h2>Spending Trend</h2>
            </div>
            <button 
              onClick={() => setTrendView(prev => prev === 'weekly' ? 'monthly' : 'weekly')}
              className="pot-yield-badge btn ghost" 
              style={{ border: 'none', cursor: 'pointer', padding: '4px 12px' }}
            >
              <BarChart3 size={14} /> {trendView === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          </div>

          <div className="trend-high-fidelity" style={{ gap: trendView === 'weekly' ? '1.5rem' : '4rem', padding: '0 1rem' }}>
            {trendData.length > 0 ? (
              trendData.map((item, i) => {
                const maxVal = Math.max(...trendData.map(d => Math.max(d.income, d.expenses)))
                const incomeH = (item.income / (maxVal || 1)) * 100
                const expenseH = (item.expenses / (maxVal || 1)) * 100

                return (
                  <div key={i} className="premium-bar-group" style={{ flex: 1 }}>
                    <div className="bar-stack">
                      <div 
                        className="bar-indicator" 
                        style={{ 
                          height: `${Math.max(2, expenseH)}%`, 
                          backgroundColor: '#ef4444', 
                          color: '#ef4444', 
                          opacity: 0.8 
                        }} 
                      />
                      <div 
                        className="bar-indicator" 
                        style={{ 
                          height: `${Math.max(2, incomeH)}%`, 
                          backgroundColor: '#10b981', 
                          color: '#10b981', 
                          opacity: 0.8 
                        }} 
                      />
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', marginTop: '0.5rem' }}>
                      {trendView === 'weekly' 
                        ? new Date(item.date).toLocaleDateString('en-ZA', { day: '2-digit' })
                        : item.label}
                    </span>
                  </div>
                )
              })
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p className="text-muted">Insufficient trend data.</p>
              </div>
            )}
          </div>
          
          <div className="trend-summary-grid">
             <div className="intel-block glass-panel" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#10b981', marginBottom: '0.25rem' }}>
                  <TrendingUp size={12} /> <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>Inflow</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '800' }}>
                  {formatCurrency(trendData.reduce((acc, d) => acc + (parseFloat(d.income) || 0), 0))}
                </div>
             </div>
             <div className="intel-block glass-panel" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#ef4444', marginBottom: '0.25rem' }}>
                  <TrendingDown size={12} /> <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>Outflow</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '800' }}>
                  {formatCurrency(trendData.reduce((acc, d) => acc + (parseFloat(d.expenses) || 0), 0))}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Financial Insights Section */}
      <section style={{ marginTop: '3rem', marginBottom: '4rem' }}>
        <div className="card-v2-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <span className="card-v2-subtitle">Optimization</span>
            <h2>Financial Insights</h2>
          </div>
          <button className="btn ghost extra-small"><Sparkles size={14} /> AI Analysis</button>
        </div>

        <div className="insight-intel-grid">
           {/* Primary Category Insight */}
           {insightsData.topCategories?.length > 0 && (
             <div className="insight-glass-item shadow-lg">
                <div className="intel-icon" style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>📊</div>
                <div className="intel-content">
                  <h4 style={{ color: 'white', marginBottom: '4px' }}>Peak Consumption</h4>
                  <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                    Major outflow detected in <strong>{insightsData.topCategories[0]?.name}</strong>. 
                    Allocation: {formatCurrency(insightsData.topCategories[0]?.total)}.
                  </p>
                </div>
             </div>
           )}

           {/* Savings Recommendation */}
           <div className={`insight-glass-item shadow-lg ${summary.savingsRate < 15 ? 'warning' : ''}`}>
              <div className="intel-icon" style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
                {summary.savingsRate > 20 ? '🏆' : summary.savingsRate > 10 ? '📈' : '⚠️'}
              </div>
              <div className="intel-content">
                <h4 style={{ color: 'white', marginBottom: '4px' }}>Savings Performance</h4>
                <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                  Current velocity: {summary.savingsRate}%. 
                  {summary.savingsRate > 20 
                    ? "Protocol optimized. Maintaining high-yield posture." 
                    : "Below tactical threshold. Recommend expense reduction."}
                </p>
              </div>
           </div>

           {/* Budget Alert */}
           {budgetPerformance.filter(b => b.percentage_used > 80).length > 0 && (
              <div className="insight-glass-item warning shadow-lg">
                <div className="intel-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>🚨</div>
                <div className="intel-content">
                  <h4 style={{ color: 'white', marginBottom: '4px' }}>Budget Violation</h4>
                  <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                    Threshold breach in {budgetPerformance.filter(b => b.percentage_used > 80).length} sectors. 
                    Recommend immediate containment.
                  </p>
                </div>
              </div>
           )}

           {/* Trend Analysis */}
           <div className="insight-glass-item shadow-lg">
              <div className="intel-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>📉</div>
              <div className="intel-content">
                <h4 style={{ color: 'white', marginBottom: '4px' }}>Historical Delta</h4>
                <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                   Data indicates a {(() => {
                      const recent = dailyTrend.slice(-3).reduce((sum, day) => sum + day.expenses, 0) / 3
                      const previous = dailyTrend.slice(-7, -3).reduce((sum, day) => sum + day.expenses, 0) / 4
                      const change = ((recent - previous) / (previous || 1) * 100).toFixed(1)
                      return change > 0 ? `spike of ${change}%` : `reduction of ${Math.abs(change)}%`
                   })()} in daily velocity compared to previous cycles.
                </p>
              </div>
           </div>
        </div>
      </section>
    </div>
  )
}
