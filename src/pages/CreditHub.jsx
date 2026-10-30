import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  LineChart as ChartIcon,
  ChevronRight,
  Info,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
  X
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAI } from '../contexts/AIContext'
import { creditAPI, debtsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function CreditHub() {
  const queryClient = useQueryClient()
  const { openCoach } = useAI()
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [newScore, setNewScore] = useState('')
  const [provider, setProvider] = useState('ClearScore')
  const [simulatedPaydown, setSimulatedPaydown] = useState(0)

  // Fetch Credit Data
  const { data: creditData, isLoading: loadingCredit } = useQuery({
    queryKey: ['credit'],
    queryFn: async () => (await creditAPI.getLatest()).data
  })

  // Fetch Debt Data for Simulation
  const { data: debtsData, isLoading: loadingDebts } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => (await debtsAPI.getAll()).data
  })

  const updateScoreMutation = useMutation({
    mutationFn: ({ score, providerName }) => creditAPI.update({ score: parseInt(score), provider: providerName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit'] })
      queryClient.invalidateQueries({ queryKey: ['ai-briefing'] })
      setShowUpdateModal(false)
      setNewScore('')
      toast.success('Credit score updated!')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Please enter a valid score between 300 and 850')
    }
  })

  const currentScore = creditData?.latestScore?.score || 0
  const currentProvider = creditData?.latestScore?.provider || 'Manual'
  const history = creditData?.history || []
  const debts = debtsData?.debts || []

  const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.balance || 0), 0)
  const totalLimit = debts.reduce((sum, d) => sum + (parseFloat(d.credit_limit) || 0), 0) || Math.max(50000, totalDebt * 1.5)
  const currentUtilization = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0

  // Interactive What-If Score Calculation
  const remainingSimDebt = Math.max(0, totalDebt - simulatedPaydown)
  const simulatedUtilization = totalLimit > 0 ? (remainingSimDebt / totalLimit) * 100 : 0
  const utilizationDrop = Math.max(0, currentUtilization - simulatedUtilization)
  const simulatedPointBoost = currentScore > 0
    ? Math.min(850 - currentScore, Math.round(utilizationDrop * 1.35 + (remainingSimDebt === 0 && totalDebt > 0 ? 18 : 0)))
    : 0
  const projectedScore = currentScore > 0 ? Math.min(850, currentScore + simulatedPointBoost) : 0

  // Simulation Logic
  const calculateSimulation = () => {
    if (currentScore === 0) return null

    const insights = []

    if (currentUtilization > 30) {
      const reductionNeeded = Math.max(0, totalDebt - (totalLimit * 0.3))
      insights.push({
        title: 'High Credit Utilization',
        impact: 'High Negative',
        desc: `Your utilization is at ${currentUtilization.toFixed(0)}%. Reducing debt by ${formatCurrency(reductionNeeded)} to reach 30% could boost your score by 40-60 points.`,
        type: 'danger'
      })
    } else {
      insights.push({
        title: 'Healthy Credit Utilization',
        impact: 'Positive',
        desc: `You are using only ${currentUtilization.toFixed(0)}% of your available credit (${formatCurrency(totalLimit)} limit). Keep it below 30% for an elite bureau rating.`,
        type: 'success'
      })
    }

    const largestDebt = [...debts].filter(d => parseFloat(d.balance) > 0).sort((a, b) => b.balance - a.balance)[0]
    if (largestDebt) {
      insights.push({
        title: `Settle ${largestDebt.name}`,
        impact: '+25 to +45 points',
        desc: `Paying off your largest active facility (${formatCurrency(largestDebt.balance)} at ${largestDebt.interest_rate}% APR) will sharply improve your NCR affordability & DTI profile.`,
        type: 'boost'
      })
    } else {
      insights.push({
        title: 'Zero Active Debt Drag',
        impact: '+30 points',
        desc: 'You have no high-balance revolving debt dragging down your TransUnion/ClearScore profile. Maintain 100% on-time debit orders.',
        type: 'success'
      })
    }

    return insights
  }

  const simulateInsights = calculateSimulation()

  const getScoreColor = (score) => {
    if (score >= 750) return '#10B981' // Excellent
    if (score >= 680) return '#34D399' // Good
    if (score >= 620) return '#FBBF24' // Fair
    if (score >= 550) return '#F59E0B' // Poor
    return '#EF4444' // Very Poor
  }

  const getScoreLabel = (score) => {
    if (score >= 750) return 'Excellent'
    if (score >= 680) return 'Good'
    if (score >= 620) return 'Fair'
    if (score >= 550) return 'Poor'
    if (score > 0) return 'Very Poor'
    return 'No Score'
  }

  if (loadingCredit || loadingDebts) return <div className="p-8">Loading your credit profile...</div>

  const displayScore = simulatedPaydown > 0 && currentScore > 0 ? projectedScore : currentScore

  return (
    <div className="credit-hub-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info dashboard-header-info">
          <h1>Credit Excellence Hub</h1>
          <p className="text-muted dash-subtitle">Track, simulate, and boost your South African credit bureau reputation</p>
        </div>
        <div className="header-actions">
          <button
            className="btn primary"
            onClick={() => setShowUpdateModal(true)}
          >
            <Plus size={16} /> Update Score
          </button>
        </div>
      </header>

      <div className="credit-grid-v2">
        {/* Main Gauge Section */}
        <div className="credit-glass-card score-main-card-v2 shadow-2xl">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '99px' }}>
              Bureau: <strong style={{ color: '#fff' }}>{currentProvider}</strong>
            </span>
            {simulatedPaydown > 0 && currentScore > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 10px', borderRadius: '99px', fontWeight: 700 }}>
                Simulated +{simulatedPointBoost} pts
              </span>
            )}
          </div>
          <div className="score-gauge-container-v2">
            <svg viewBox="0 0 100 55" className="score-gauge-v2">
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="#1e293b"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke={getScoreColor(displayScore)}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${Math.max(0, (displayScore - 300) / (850 - 300) * 125.6)} 125.6`}
                style={{ filter: `drop-shadow(0 0 8px ${getScoreColor(displayScore)}40)` }}
              />
            </svg>
            <div className="score-value-overlay-v2">
              <span className="score-number-v2" style={{ textShadow: `0 0 20px ${getScoreColor(displayScore)}80`, color: getScoreColor(displayScore) }}>
                {displayScore || '---'}
              </span>
              <span className="score-label-v2" style={{ color: getScoreColor(displayScore) }}>
                {getScoreLabel(displayScore)}
              </span>
            </div>
          </div>
          <div className="score-info-v2">
            <p>Score updated {creditData?.latestScore?.last_updated ? new Date(creditData.latestScore.last_updated).toLocaleDateString('en-ZA') : 'never'}</p>
            <div className="score-range-v2">
              <span>300</span>
              <div className="range-bar-v2"></div>
              <span>850</span>
            </div>
          </div>
        </div>

        {/* Simulator Section */}
        <div className="credit-glass-card simulator-card-v2">
          <div className="card-header-v2">
            <h3 className="card-title-v2">
              <Zap size={20} className="text-amber-400" /> Smart Score Simulator
            </h3>
            <span className="badge-amber-v2">Interactive AI</span>
          </div>
          
          <div className="simulator-content-v2">
            {currentScore === 0 ? (
              <div className="empty-simulator-v2">
                <Info size={32} />
                <p>Update your credit score to unlock interactive What-If simulations.</p>
                <button className="btn primary small" style={{ marginTop: '0.75rem' }} onClick={() => setShowUpdateModal(true)}>
                  Enter My Score
                </button>
              </div>
            ) : (
              <>
                {/* Interactive Paydown Slider */}
                {totalDebt > 0 && (
                  <div
                    style={{
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
                        Simulate Debt Paydown: <strong style={{ color: '#4f8cff' }}>{formatCurrency(simulatedPaydown)}</strong>
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>
                        {simulatedPointBoost > 0 ? `+${simulatedPointBoost} pts (${projectedScore})` : 'Drag slider'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.ceil(totalDebt)}
                      step={Math.max(100, Math.round(totalDebt / 20))}
                      value={simulatedPaydown}
                      onChange={(e) => setSimulatedPaydown(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#4f8cff', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                      <span>Current Util: {currentUtilization.toFixed(0)}%</span>
                      <span>Projected Util: {simulatedUtilization.toFixed(0)}%</span>
                    </div>
                  </div>
                )}

                <div className="insights-list-v2">
                  {simulateInsights?.map((insight, i) => {
                    const getColor = (type) => {
                      if (type === 'danger') return '#EF4444'
                      if (type === 'boost') return '#4f8cff'
                      if (type === 'success') return '#10B981'
                      return '#94A3B8'
                    }
                    
                    return (
                      <div 
                        key={i} 
                        className={`insight-item-v2 ${insight.type}`}
                        onClick={() => openCoach(`I'm looking at my credit score insight: "${insight.title}". ${insight.desc} Can you give me more specific steps on how to execute this?`)}
                      >
                        <div className="insight-icon-v2" style={{ backgroundColor: `${getColor(insight.type)}20`, color: getColor(insight.type) }}>
                          {insight.type === 'danger' ? <TrendingDown size={18} /> : <ShieldCheck size={18} />}
                        </div>
                        <div className="insight-text-v2">
                          <div className="insight-header-v2">
                            <h4>{insight.title}</h4>
                            <span className="insight-impact-v2" style={{ color: getColor(insight.type), border: `1px solid ${getColor(insight.type)}30` }}>{insight.impact}</span>
                          </div>
                          <p>{insight.desc}</p>
                        </div>
                        <ChevronRight className="insight-arrow-v2" />
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          
          <div className="simulator-footer-v2">
            <p>Based on your active debt profile of <strong>{formatCurrency(totalDebt)}</strong> across {debts.length} facilities</p>
          </div>
        </div>

        {/* Score History Chart */}
        <div className="credit-glass-card history-card-v2">
          <div className="card-header-v2">
            <h3 className="card-title-v2">
              <ChartIcon size={20} className="text-blue-400" /> Score History
            </h3>
          </div>
          <div className="history-chart-placeholder-v2">
            {history.length >= 1 ? (
              <div className="mini-chart-v2">
                {history.slice().reverse().map((h, i) => (
                   <div key={i} className="chart-bar-wrapper-v2" title={`${h.score} (${h.provider || 'Manual'})`}>
                     <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '4px', fontFamily: 'JetBrains Mono, monospace' }}>{h.score}</span>
                     <div 
                      className="chart-bar-v2" 
                      style={{ 
                        height: `${Math.max(12, (h.score - 300) / (850 - 300) * 100)}%`,
                        backgroundColor: getScoreColor(h.score),
                        boxShadow: `0 0 10px ${getScoreColor(h.score)}40`
                      }}
                     ></div>
                     <span className="bar-label-v2">{new Date(h.last_updated).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}</span>
                   </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400" style={{ textAlign: 'center', width: '100%', paddingBottom: '2rem' }}>Log your first credit score to start tracking your bureau history.</p>
            )}
          </div>
        </div>

        {/* Credit Education Section */}
        <div className="credit-glass-card education-card-v2">
           <div className="card-header-v2">
             <h3 className="card-title-v2">
               <Info size={20} className="text-emerald-400" /> SA Bureau Mastery
             </h3>
           </div>
           <div className="edu-list-v2">
             <div className="edu-item-v2">
                <TrendingUp size={18} className="text-emerald-400" />
                <span>Pay all debit orders on time (35% of SA score)</span>
             </div>
             <div className="edu-item-v2">
                <TrendingUp size={18} className="text-emerald-400" />
                <span>Keep revolving credit utilization under 30%</span>
             </div>
             <div className="edu-item-v2">
                <TrendingUp size={18} className="text-emerald-400" />
                <span>Avoid multiple hard credit inquiries within 90 days</span>
             </div>
           </div>
           <button 
             className="btn secondary full-width" 
             style={{ marginTop: 'auto', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
             onClick={() => openCoach("I want some deep advice on mastering my South African credit score based on my current financial profile (debts, score, utilization). What are the highest-impact steps I should take this month 🇿🇦?")}
           >
             Get Deep Advice <ArrowRight size={16} />
           </button>
        </div>
      </div>

      {/* Update Score Modal */}
      {showUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal-content glass-modal shadow-2xl" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-v2">
              <div className="header-info">
                <h2 style={{ fontSize: '1.5rem', color: 'white' }}>Update Credit Score</h2>
                <p className="text-muted">Keep your credit bureau reputation accurate</p>
              </div>
              <button className="btn ghost small" onClick={() => setShowUpdateModal(false)}><X size={20} /></button>
            </div>

            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <div className="premium-form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Credit Bureau / Source</label>
                <select
                  className="premium-input"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="ClearScore">ClearScore ZA</option>
                  <option value="TransUnion">TransUnion</option>
                  <option value="Experian">Experian</option>
                  <option value="XDS">XDS (Splendi)</option>
                  <option value="Bank App">FNB / Capitec / Standard Bank App</option>
                  <option value="Manual">Other / Manual</option>
                </select>
              </div>

              <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Enter your current score (300 – 850)</label>
                <input 
                  type="number" 
                  className="premium-input" 
                  placeholder="e.g. 720"
                  value={newScore}
                  onChange={e => setNewScore(e.target.value)}
                  min="300"
                  max="850"
                />
              </div>
              
              <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '-1rem', marginBottom: '1.75rem', display: 'block' }}>
                Valid South African credit bureau scores range from 300 to 850.
              </p>

              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="btn ghost" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                <button 
                  className="btn primary" 
                  onClick={() => updateScoreMutation.mutate({ score: newScore, providerName: provider })}
                  disabled={!newScore || updateScoreMutation.isPending}
                >
                  {updateScoreMutation.isPending ? 'Saving...' : 'Save Score'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
