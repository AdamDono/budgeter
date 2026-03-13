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
    Zap
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAI } from '../contexts/AIContext'
import { creditAPI, debtsAPI } from '../lib/api'

export default function CreditHub() {
  const queryClient = useQueryClient()
  const { openCoach } = useAI()
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [newScore, setNewScore] = useState('')

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
    mutationFn: (score) => creditAPI.update({ score: parseInt(score) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['credit'])
      setShowUpdateModal(false)
      setNewScore('')
      toast.success('Credit score updated!')
    }
  })

  const currentScore = creditData?.latestScore?.score || 0
  const history = creditData?.history || []
  const debts = debtsData?.debts || []

  // Simulation Logic
  const calculateSimulation = () => {
    if (currentScore === 0) return null

    const insights = []
    let totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.balance), 0)
    
    // Insight 1: Debt Utilization
    // Assuming a generic total credit limit of R50,000 if not specified
    const totalLimit = debts.reduce((sum, d) => sum + (parseFloat(d.credit_limit) || 0), 0) || 50000
    const utilization = (totalDebt / totalLimit) * 100

    if (utilization > 30) {
      const reductionNeeded = totalDebt - (totalLimit * 0.3)
      insights.push({
        title: 'High Credit Utilization',
        impact: 'High Negative',
        desc: `Your utilization is at ${utilization.toFixed(0)}%. Reducing debt by R${reductionNeeded.toLocaleString()} to reach 30% could boost your score by 40-60 points.`,
        type: 'danger'
      })
    } else {
      insights.push({
        title: 'Great Utilization',
        impact: 'Positive',
        desc: `You are using only ${utilization.toFixed(0)}% of your available credit. Keep it below 30% for a healthy score.`,
        type: 'success'
      })
    }

    // Insight 2: Payoff Simulator
    const largestDebt = [...debts].sort((a, b) => b.balance - a.balance)[0]
    if (largestDebt) {
      insights.push({
        title: `Pay off ${largestDebt.name}`,
        impact: '+25 to +40 points',
        desc: `Paying off your largest debt of R${parseFloat(largestDebt.balance).toLocaleString()} would significantly lower your debt-to-income ratio.`,
        type: 'boost'
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

  return (
    <div className="credit-hub-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info">
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>Credit Excellence Hub</h1>
          <p className="text-muted">Track, simulate, and boost your financial reputation</p>
        </div>
        <button
          className="btn primary extra-small"
          style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
          onClick={() => setShowUpdateModal(true)}
        >
          <Plus size={16} />
          Update Score
        </button>
      </header>

      <div className="credit-grid-v2">
        {/* Main Gauge Section */}
        <div className="credit-glass-card score-main-card-v2 shadow-2xl">
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
                stroke={getScoreColor(currentScore)}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${Math.max(0, (currentScore - 300) / (850 - 300) * 125.6)} 125.6`}
                style={{ filter: `drop-shadow(0 0 8px ${getScoreColor(currentScore)}40)` }}
              />
            </svg>
            <div className="score-value-overlay-v2">
              <span className="score-number-v2" style={{ textShadow: `0 0 20px ${getScoreColor(currentScore)}80`, color: getScoreColor(currentScore) }}>{currentScore || '---'}</span>
              <span className="score-label-v2" style={{ color: getScoreColor(currentScore) }}>
                {getScoreLabel(currentScore)}
              </span>
            </div>
          </div>
          <div className="score-info-v2">
            <p>Score updated {creditData?.latestScore?.last_updated ? new Date(creditData.latestScore.last_updated).toLocaleDateString() : 'never'}</p>
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
            <span className="badge-amber-v2">Secret Sauce AI</span>
          </div>
          
          <div className="simulator-content-v2">
            {currentScore === 0 ? (
              <div className="empty-simulator-v2">
                <Info size={32} />
                <p>Update your credit score to unlock the simulator insights.</p>
              </div>
            ) : (
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
            )}
          </div>
          
          <div className="simulator-footer-v2">
            <p>Based on your current debt profile of <strong>R{debts.reduce((sum, d) => sum + parseFloat(d.balance), 0).toLocaleString()}</strong></p>
          </div>
        </div>

        {/* Score History Chart Placeholder */}
        <div className="credit-glass-card history-card-v2">
          <div className="card-header-v2">
            <h3 className="card-title-v2">
              <ChartIcon size={20} className="text-blue-400" /> Score History
            </h3>
          </div>
          <div className="history-chart-placeholder-v2">
            {history.length > 1 ? (
              <div className="mini-chart-v2">
                {history.slice().reverse().map((h, i) => (
                   <div key={i} className="chart-bar-wrapper-v2">
                     <div 
                      className="chart-bar-v2" 
                      style={{ 
                        height: `${Math.max(10, (h.score - 300) / (850 - 300) * 100)}%`,
                        backgroundColor: getScoreColor(h.score),
                        boxShadow: `0 0 10px ${getScoreColor(h.score)}40`
                      }}
                     ></div>
                     <span className="bar-label-v2">{new Date(h.last_updated).toLocaleDateString(undefined, { month: 'short' })}</span>
                   </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400" style={{ textAlign: 'center', width: '100%', paddingBottom: '2rem' }}>Not enough data to show history yet.</p>
            )}
          </div>
        </div>

        {/* Credit Education Section */}
        <div className="credit-glass-card education-card-v2">
           <div className="card-header-v2">
             <h3 className="card-title-v2">
               <Info size={20} className="text-emerald-400" /> Mastery Guide
             </h3>
           </div>
           <div className="edu-list-v2">
             <div className="edu-item-v2">
                <TrendingUp size={18} className="text-emerald-400" />
                <span>Pay all accounts on time (35% of score)</span>
             </div>
             <div className="edu-item-v2">
                <TrendingUp size={18} className="text-emerald-400" />
                <span>Keep credit use below 30% (30% of score)</span>
             </div>
             <div className="edu-item-v2">
                <TrendingUp size={18} className="text-emerald-400" />
                <span>Don't open too many new accounts at once</span>
             </div>
           </div>
           <button 
             className="btn secondary full-width" 
             style={{ marginTop: 'auto', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
             onClick={() => openCoach("I want some deep advice on mastering my credit score based on my current financial profile (debts, score, etc.). What are some long-term habits I should start 🇿🇦?")}
           >
             Get Deep Advice <ArrowRight size={16} />
           </button>
        </div>
      </div>

      {/* Update Score Modal */}
      {showUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Credit Score</h2>
              <button className="modal-close" onClick={() => setShowUpdateModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Enter your current score (from ClearScore/TransUnion)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="e.g. 720"
                value={newScore}
                onChange={e => setNewScore(e.target.value)}
                min="300"
                max="850"
              />
              <p className="form-help">Valid South African scores range from 300 to 850.</p>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setShowUpdateModal(false)}>Cancel</button>
              <button 
                className="btn primary" 
                onClick={() => updateScoreMutation.mutate(newScore)}
                disabled={!newScore || updateScoreMutation.isLoading}
              >
                Save Score
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
