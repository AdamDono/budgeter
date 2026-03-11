import { useQuery } from '@tanstack/react-query'
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  CreditCard,
  Wallet,
  Clock
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import ForexWidget from '../components/ForexWidget'
import { SkeletonDashboard } from '../components/Skeleton'
import { analyticsAPI, billsAPI, goalsAPI, transactionsAPI, debtsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', selectedMonth],
    queryFn: async () => (await analyticsAPI.getDashboard('30d')).data,
  })

  const { data: recentTransactions } = useQuery({
    queryKey: ['transactions', { limit: 5 }],
    queryFn: async () => (await transactionsAPI.getAll({ limit: 5 })).data,
  })

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => (await goalsAPI.getAll()).data,
  })

  const { data: debtsResponse } = useQuery({
    queryKey: ['debts-all'],
    queryFn: async () => (await debtsAPI.getAll()).data,
  })

  if (isLoading) return <SkeletonDashboard />

  const summary = dashboardData?.summary || {}
  const categories = dashboardData?.categories || []
  const debts = debtsResponse?.debts || []
  
  const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.balance), 0)
  const activeDebtsCount = debts.length

  // Calculate most optimized payoff target (Highest Interest Rate)
  const sortedByInterest = [...debts].sort((a, b) => parseFloat(b.interest_rate) - parseFloat(a.interest_rate))
  const nextPayoffTarget = sortedByInterest.length > 0 ? sortedByInterest[0] : null

  const netIncome = summary.netIncome || 0
  const savingsRate = summary.savingsRate || 0
  
  // AI Strategic Insights - Now based on real data
  const aiBriefing = {
    headline: netIncome > 0 
      ? `You've generated ${formatCurrency(netIncome)} in surplus capital this month!` 
      : `Notice: You are currently running a ${formatCurrency(Math.abs(netIncome))} deficit.`,
    suggestion: netIncome > 0
      ? `I recommend allocating ${formatCurrency(netIncome * 0.4)} towards your '${goals?.goals?.[0]?.name || 'Savings'}' to maintain your ${savingsRate}% velocity.`
      : `I suggest reviewing your Outflow items to identify at least ${formatCurrency(Math.abs(netIncome))} in potential optimizations.`,
    action: netIncome > 0 ? "/app/savings" : "/app/transactions"
  }

  return (
    <div className="dashboard-v2">
      {/* Background Glows */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <header className="dash-header">
        <div className="header-info">
          <h1>Dashboard</h1>
          <p className="text-muted">Strategic Intel for {new Date(selectedMonth + '-01').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="header-actions">
          <div className="month-picker-pill">
            <Calendar size={16} />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* AI Strategic Briefing - The "Hero" of the Dash */}
      <section className="ai-briefing-card glass-panel">
        <div className="ai-briefing-content">
          <div className="ai-badge">AI STRATEGIC BRIEFING</div>
          <h2>{aiBriefing.headline}</h2>
          <p>{aiBriefing.suggestion}</p>
        </div>
        <Link to={aiBriefing.action} className="ai-action-btn">
          Optimize <ArrowRight size={16} />
        </Link>
      </section>

      {/* The Bento Grid Layout */}
      <div className="bento-grid">
        
        {/* Core Metrics Bento (Large) */}
        <div className="bento-item glass-panel cashflow-box span-2">
          <div className="item-header">
            <h3>Net Cashflow</h3>
            <span className="badge success">Calculated</span>
          </div>
          <div className="cashflow-display">
            <div className="main-stat">
              <span className="label">Available Capital</span>
              <span className="value">{formatCurrency(summary.netIncome || 0)}</span>
            </div>
            <div className="stat-pills">
              <div className="stat-pill inc">
                <TrendingUp size={14} /> 
                <div className="pill-vals">
                  <span className="p-label">Inflow</span>
                  <span className="p-val">{formatCurrency(summary.totalIncome || 0)}</span>
                </div>
              </div>
              <div className="stat-pill exp">
                <TrendingDown size={14} />
                <div className="pill-vals">
                  <span className="p-label">Outflow</span>
                  <span className="p-val">{formatCurrency(summary.totalExpenses || 0)}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Subtle Visual Indicator (CSS Sparkline) */}
          <div className="visual-indicator">
            <div className="indicator-bar" style={{ width: `${summary.savingsRate || 0}%` }}></div>
          </div>
          <div className="indicator-label">
            <span>Savings Velocity: <strong>{summary.savingsRate || 0}%</strong></span>
          </div>
        </div>

        {/* Debt Eradication Bento */}
        <div className="bento-item glass-panel debt-box span-2">
          <div className="item-header">
            <div className="title-with-icon">
              <ShieldCheck className="text-accent" size={18} />
              <h3>Tactical Debt Overview</h3>
            </div>
            <Link to="/app/debt" className="view-link">Analyze Liability</Link>
          </div>
          <div className="debt-stats">
            <div className="stat-circle">
              <div className="circle-content">
                <span className="c-val">{activeDebtsCount}</span>
                <span className="c-label">Holdings</span>
              </div>
            </div>
            <div className="debt-info">
              <span className="d-label">Total Outstanding Liability</span>
              <span className="d-val">{formatCurrency(totalDebt)}</span>
            </div>
          </div>
          <div className="next-move">
            <div className="move-icon"><Zap size={14} /></div>
            {nextPayoffTarget ? (
              <p>Strategic payoff target: <strong>{nextPayoffTarget.name}</strong> ({nextPayoffTarget.interest_rate}% APR - Most optimized move)</p>
            ) : (
              <p>All liabilities cleared. <strong>Strategic focus: Asset Accumulation.</strong></p>
            )}
          </div>
        </div>

        {/* Savings Goals Bento */}
        <div className="bento-item glass-panel goals-box span-2">
          <div className="item-header">
            <h3>Active Targets</h3>
            <Link to="/app/goals" className="view-link">All Goals</Link>
          </div>
          <div className="goals-mini-list">
            {goals?.goals?.slice(0, 3).map(goal => (
              <div key={goal.id} className="goal-mini-item">
                <div className="goal-mini-info">
                  <span className="g-name">{goal.name}</span>
                  <span className="g-perc">{goal.progress_percentage}%</span>
                </div>
                <div className="mini-progress">
                  <div className="mini-bar" style={{ width: `${goal.progress_percentage}%`, backgroundColor: goal.color || 'var(--accent)' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Intel (Transactions) */}
        <div className="bento-item glass-panel trans-box span-2">
          <div className="item-header">
            <h3>Recent Operations</h3>
            <Link to="/app/transactions" className="view-link">Archive</Link>
          </div>
          <div className="intel-list">
            {recentTransactions?.transactions?.map(tx => (
              <div key={tx.id} className="intel-item">
                <div className="intel-icon">
                  {tx.type === 'income' ? <TrendingUp size={16} className="text-pos" /> : <TrendingDown size={16} className="text-neg" />}
                </div>
                <div className="intel-content">
                  <span className="intel-title">{tx.description}</span>
                  <span className="intel-meta">{tx.category_name} • {new Date(tx.transaction_date).toLocaleDateString()}</span>
                </div>
                <span className={`intel-amount ${tx.type}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
