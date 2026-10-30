import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  Edit3,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
  X,
  Zap
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { debtsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const DEBT_TYPE_LABELS = {
  'credit-card': 'Credit Card',
  'personal-loan': 'Personal Loan',
  'vehicle-finance': 'Vehicle Finance',
  'mortgage': 'Home Loan / Bond',
  'store-card': 'Store Card (TFG/Woolies)',
  'bnpl': 'BNPL (PayJustNow/Float)',
  'student-loan': 'Student Loan',
  'other': 'Other Liability'
}

export default function Debt() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDebt, setEditingDebt] = useState(null)
  const [payModalDebt, setPayModalDebt] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })
  const [payoffStrategy, setPayoffStrategy] = useState('snowball')
  const [extraPayment, setExtraPayment] = useState(500)
  const [rateDelta, setRateDelta] = useState(0)
  const queryClient = useQueryClient()

  const { data: debtsData, isLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => (await debtsAPI.getAll()).data,
  })

  const { data: payoffPlanData } = useQuery({
    queryKey: ['payoff-plan', payoffStrategy, extraPayment, rateDelta],
    queryFn: async () => (await debtsAPI.calculatePayoff(payoffStrategy, extraPayment, rateDelta)).data,
  })

  const invalidateAllDebtQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['debts'] })
    queryClient.invalidateQueries({ queryKey: ['debts-all'] })
    queryClient.invalidateQueries({ queryKey: ['payoff-plan'] })
    queryClient.invalidateQueries({ queryKey: ['credit'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['ai-briefing'] })
  }

  const createMutation = useMutation({
    mutationFn: debtsAPI.create,
    onSuccess: () => {
      invalidateAllDebtQueries()
      setShowAddForm(false)
      toast.success('Debt added successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add debt')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => debtsAPI.update(id, data),
    onSuccess: () => {
      invalidateAllDebtQueries()
      setEditingDebt(null)
      toast.success('Debt updated successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update debt')
    }
  })

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => debtsAPI.pay(id, data),
    onSuccess: (res) => {
      invalidateAllDebtQueries()
      setPayModalDebt(null)
      toast.success(res.data?.message || 'Payment recorded!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to record payment')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: debtsAPI.delete,
    onSuccess: () => {
      invalidateAllDebtQueries()
      toast.success('Debt removed!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to remove debt')
    }
  })

  const handleAddDebt = (formData) => {
    createMutation.mutate(formData)
  }

  const handleUpdateDebt = (formData) => {
    if (editingDebt) {
      updateMutation.mutate({ id: editingDebt.id, data: formData })
    }
  }

  const handleDeleteDebt = (id) => {
    setDeleteConfirm({ show: true, id })
  }

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      deleteMutation.mutate(deleteConfirm.id)
    }
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading debts..." />
  }

  const debts = debtsData?.debts || []
  const payoffPlan = payoffPlanData
  const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.balance), 0)
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + parseFloat(d.monthly_payment || 0), 0)

  // Rollover payoff timeline simulation for client-side visual comparison
  const simulatePayoff = (debtsList, strategy, extra = extraPayment, delta = rateDelta) => {
    if (debtsList.length === 0) return []
    const simDebts = debtsList.map(d => ({
      name: d.name,
      balance: Math.max(0, parseFloat(d.balance) || 0),
      rate: Math.max(0, ((parseFloat(d.interest_rate) || 0) + parseFloat(delta || 0))) / 100 / 12,
      minPayment: Math.max(10, parseFloat(d.monthly_payment) || 10)
    }))

    const totalMinPayment = simDebts.reduce((sum, d) => sum + (d.balance > 0 ? d.minPayment : 0), 0)
    const monthlyBudget = totalMinPayment + Math.max(0, parseFloat(extra) || 0)

    let month = 0
    const history = [simDebts.reduce((sum, d) => sum + d.balance, 0)]

    while (month < 180) {
      let activeDebts = simDebts.filter(d => d.balance > 0.01)
      if (activeDebts.length === 0) break

      if (strategy === 'snowball') {
        activeDebts.sort((a, b) => a.balance - b.balance)
      } else {
        activeDebts.sort((a, b) => b.rate - a.rate)
      }

      let remainingBudget = monthlyBudget

      // Apply interest and pay minimums
      for (let d of activeDebts) {
        const interest = d.balance * d.rate
        d.balance += interest

        const payment = Math.min(d.balance, d.minPayment)
        d.balance -= payment
        remainingBudget -= payment
      }

      // Funnel any extra budget across priority debts
      for (let d of activeDebts) {
        if (remainingBudget <= 0.01) break
        if (d.balance > 0) {
          const extraPay = Math.min(d.balance, remainingBudget)
          d.balance -= extraPay
          remainingBudget -= extraPay
        }
      }

      const currentTotal = simDebts.reduce((sum, d) => sum + Math.max(0, d.balance), 0)
      history.push(currentTotal)
      if (currentTotal <= 0.01) break
      month++
    }

    return history
  }

  const snowballTimeline = simulatePayoff(debts, 'snowball', extraPayment, rateDelta)
  const avalancheTimeline = simulatePayoff(debts, 'avalanche', extraPayment, rateDelta)

  const chartData = {
    labels: Array.from(
      { length: Math.max(snowballTimeline.length, avalancheTimeline.length) },
      (_, i) => `Month ${i}`
    ),
    datasets: [
      {
        label: 'Snowball Method (Quick Wins)',
        data: snowballTimeline,
        borderColor: '#4f8cff',
        backgroundColor: 'rgba(79, 140, 255, 0.05)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        fill: true,
      },
      {
        label: 'Avalanche Method (Lowest Interest)',
        data: avalancheTimeline,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        fill: true,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter, sans-serif', size: 12, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: '#121a2c',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context) => `Remaining: R ${context.raw.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: {
          color: '#64748b',
          callback: (value) => `R ${value.toLocaleString()}`
        }
      }
    }
  }

  return (
    <div className="debt-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info dashboard-header-info">
          <h1>Debt Management</h1>
          <p className="text-muted dash-subtitle">Track, stress-test, and eradicate your liabilities strategically</p>
        </div>
        <div className="header-actions">
          <button
            className="btn primary"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} /> Add Debt
          </button>
        </div>
      </header>

      {/* High-Fidelity Intel Row */}
      <div className="analytics-summary-stats">
        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <DollarSign size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Total Debt</span>
            <span className="intel-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(totalDebt)}</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <TrendingDown size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Monthly Commitment</span>
            <span className="intel-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(totalMonthlyPayment + extraPayment)}</span>
            {extraPayment > 0 && (
              <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Includes +{formatCurrency(extraPayment)} boost</span>
            )}
          </div>
        </div>

        <div className="intel-block glass-panel highlight" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <Calendar size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Payoff Timeline</span>
            <span className="intel-value" style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>
              {payoffPlan ? `${payoffPlan.months} months` : 'N/A'}
            </span>
            {payoffPlan?.monthsSaved > 0 && (
              <span style={{ fontSize: '0.72rem', color: '#10b981' }}>⚡ {payoffPlan.monthsSaved} months faster!</span>
            )}
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Sparkles size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Total Interest</span>
            <span className="intel-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>
              {payoffPlan ? formatCurrency(payoffPlan.totalInterest) : 'N/A'}
            </span>
            {parseFloat(payoffPlan?.interestSaved) > 0 && (
              <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Saves {formatCurrency(payoffPlan.interestSaved)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Payoff Strategy & Interactive Simulator */}
      {debts.length > 0 && (
        <div className="payoff-plan-v2">
          <div className="card-v2-header">
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Payoff Strategy & SARB Stress-Tester</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Simulate extra monthly debt-snowball rollovers and SARB Repo/Prime interest rate changes in real time
              </p>
            </div>
          </div>
          <div className="strategy-row-v2" style={{ marginBottom: '1.5rem' }}>
            <div
              className={`strategy-btn-v2 ${payoffStrategy === 'snowball' ? 'active' : ''}`}
              onClick={() => setPayoffStrategy('snowball')}
            >
              <h4>Snowball Method</h4>
              <p>Pay smallest debt first for quick psychological wins</p>
            </div>
            <div
              className={`strategy-btn-v2 ${payoffStrategy === 'avalanche' ? 'active' : ''}`}
              onClick={() => setPayoffStrategy('avalanche')}
            >
              <h4>Avalanche Method</h4>
              <p>Pay highest APR first for maximum ZAR interest savings</p>
            </div>
          </div>

          {/* Interactive Rollover & SARB Rate Sliders */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
              padding: '1.25rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: '1.5rem'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
                  🚀 Extra Monthly Rollover Boost
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#10b981' }}>
                  +{formatCurrency(extraPayment)} / mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="250"
                value={extraPayment}
                onChange={(e) => setExtraPayment(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                <span>R0 (Minimums only)</span>
                <span>R2,500</span>
                <span>R5,000</span>
                <span>R10,000</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
                  🏦 SARB Prime Rate Shift (Stress Test)
                </span>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    color: rateDelta < 0 ? '#10b981' : rateDelta > 0 ? '#ef4444' : '#4f8cff'
                  }}
                >
                  {rateDelta > 0 ? `+${rateDelta.toFixed(2)}%` : `${rateDelta.toFixed(2)}%`}
                </span>
              </div>
              <input
                type="range"
                min="-1.5"
                max="2.0"
                step="0.25"
                value={rateDelta}
                onChange={(e) => setRateDelta(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#4f8cff', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                <span>-1.50% (Rate Cuts)</span>
                <span>0% (Current Prime)</span>
                <span>+2.00% (Rate Hikes)</span>
              </div>
            </div>
          </div>
          
          {/* Visual Timelines Comparison Chart */}
          <div className="visual-payoff-chart-container" style={{ height: '300px', width: '100%', marginTop: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h3 style={{ fontSize: '1rem', color: 'white', marginBottom: '1rem', fontWeight: 700 }}>Eradication Velocity Comparison</h3>
            <div style={{ height: '240px', position: 'relative' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Debts List */}
      <div className="payoff-plan-v2">
        <div className="card-v2-header">
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>Your Debts</h2>
          </div>
        </div>
        {debts.length > 0 ? (
          <div className="goals-glass-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', display: 'grid', gap: '1.5rem' }}>
            {debts.map((debt) => {
              const payoffInfo = payoffPlan?.plan?.find(p => p.id === debt.id)
              const isPaidOff = parseFloat(debt.balance) <= 0
              const limit = parseFloat(debt.credit_limit) || 0
              const utilization = limit > 0 ? Math.min(100, (parseFloat(debt.balance) / limit) * 100) : null

              return (
                <div key={debt.id} className={`debt-glass-card shadow-2xl ${isPaidOff ? 'paid-off' : ''}`}>
                  <div className="debt-card-header-v2">
                    <div>
                      <h3>{debt.name}</h3>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '4px' }}>
                        {DEBT_TYPE_LABELS[debt.type] || debt.type}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isPaidOff && <CheckCircle size={18} className="text-pos" />}
                      <button
                        className="btn ghost extra-small"
                        title="Edit Debt"
                        style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                        onClick={() => setEditingDebt(debt)}
                      >
                        <Edit3 size={14} color="#94a3b8" />
                      </button>
                      <button
                        className="btn ghost extra-small"
                        title="Remove Debt"
                        style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                        onClick={() => handleDeleteDebt(debt.id)}
                      >
                        <Trash2 size={14} color="#94a3b8" />
                      </button>
                    </div>
                  </div>

                  <div className="debt-details-grid">
                    <div className="debt-detail-v2">
                      <span className="label">Balance:</span>
                      <span className="value highlight">{formatCurrency(debt.balance)}</span>
                    </div>
                    <div className="debt-detail-v2">
                      <span className="label">Interest Rate:</span>
                      <span className="value highlight">{debt.interest_rate}%</span>
                    </div>
                    <div className="debt-detail-v2">
                      <span className="label">Monthly Payment:</span>
                      <span className="value highlight">{formatCurrency(debt.monthly_payment)}</span>
                    </div>
                    {limit > 0 && (
                      <div className="debt-detail-v2">
                        <span className="label">Credit Limit:</span>
                        <span className="value">{formatCurrency(limit)} ({utilization.toFixed(0)}% used)</span>
                      </div>
                    )}
                  </div>

                  {payoffInfo && (
                    <div className="debt-payoff-info-v2">
                      <div className="payoff-row">
                        <span>Target Payoff:</span>
                        <strong>{payoffInfo.payoffMonths} months</strong>
                      </div>
                      <div className="payoff-row">
                        <span>Projected Interest:</span>
                        <strong>{formatCurrency(payoffInfo.totalInterest)}</strong>
                      </div>
                    </div>
                  )}

                  <div className="debt-progress-v2" style={{ marginTop: 'auto', marginBottom: '0.85rem' }}>
                    <div
                      className="debt-progress-fill-v2"
                      style={{
                        width: `${isPaidOff ? 100 : Math.min(100, ((parseFloat(debt.monthly_payment) || 0) / (parseFloat(debt.balance) || 1) * 100))}%`
                      }}
                    ></div>
                  </div>

                  {!isPaidOff && (
                    <button
                      className="btn primary small"
                      style={{ width: '100%', justifyContent: 'center', borderRadius: '10px', padding: '0.6rem' }}
                      onClick={() => setPayModalDebt(debt)}
                    >
                      <Zap size={14} /> Record Payment
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="savings-empty-state">
            <div className="empty-pot-icon">
              <TrendingDown size={32} />
            </div>
            <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>No Debts Tracked</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Add your credit cards, vehicle finance, store cards, or bonds to generate a payoff roadmap</p>
            <button
              className="btn primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Your First Debt
            </button>
          </div>
        )}
      </div>

      {/* High-Fidelity Payoff Plan Timeline */}
      {debts.length > 0 && payoffPlan && payoffPlan.plan.length > 0 && (
        <div className="payoff-plan-v2">
          <div className="card-v2-header">
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Strategic Roadmap
              </h2>
              <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                Estimated elimination path via <strong>{payoffStrategy === 'snowball' ? 'Snowball' : 'Avalanche'}</strong>. All debts clear in <strong>{payoffPlan.months} months</strong> with a total interest cost of <strong>{formatCurrency(payoffPlan.totalInterest)}</strong>.
              </p>
            </div>
          </div>
          
          <div className="payoff-timeline-v2">
            {payoffPlan.plan.map((debtInfo, idx) => (
              <div key={idx} className="timeline-step-v2">
                <div className="timeline-marker-v2"></div>
                <div className="timeline-content-v2">
                  <div>
                    <h4>{debtInfo.name}</h4>
                    <p>Targeted payoff in {debtInfo.payoffMonths} months</p>
                  </div>
                  <div className="timeline-metric-v2">
                    <span className="value">{formatCurrency(debtInfo.totalInterest)}</span>
                    <span className="label">Interest Cost</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Debt Modal */}
      {showAddForm && (
        <DebtForm
          onSubmit={handleAddDebt}
          onClose={() => setShowAddForm(false)}
          loading={createMutation.isPending}
        />
      )}

      {/* Edit Debt Modal */}
      {editingDebt && (
        <DebtForm
          initialData={editingDebt}
          onSubmit={handleUpdateDebt}
          onClose={() => setEditingDebt(null)}
          loading={updateMutation.isPending}
        />
      )}

      {/* Quick Pay Debt Modal */}
      {payModalDebt && (
        <PayDebtModal
          debt={payModalDebt}
          onClose={() => setPayModalDebt(null)}
          onSubmit={(data) => payMutation.mutate({ id: payModalDebt.id, data })}
          loading={payMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Remove Debt"
        message="Are you sure you want to remove this debt? This action cannot be undone."
        confirmText="Remove"
        type="danger"
      />
    </div>
  )
}

function PayDebtModal({ debt, onSubmit, onClose, loading }) {
  const [amount, setAmount] = useState(debt.monthly_payment || '')
  const [description, setDescription] = useState(`Payment towards ${debt.name}`)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ amount: parseFloat(amount), description })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-modal shadow-2xl"
        style={{ maxWidth: '440px', margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-v2" style={{ padding: '1.5rem 1.5rem 1rem' }}>
          <div className="header-info">
            <h2 style={{ fontSize: '1.35rem', color: 'white', fontWeight: 700, margin: '0 0 4px' }}>
              Pay {debt.name}
            </h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Current Balance: {formatCurrency(debt.balance)}
            </p>
          </div>
          <button className="btn ghost small" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.75rem' }}>
          <div className="premium-form-group" style={{ marginBottom: '1rem' }}>
            <label>Payment Amount (ZAR)</label>
            <input
              type="number"
              className="premium-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="1"
              max={debt.balance}
              required
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn ghost extra-small"
                onClick={() => setAmount(debt.monthly_payment)}
              >
                Min ({formatCurrency(debt.monthly_payment)})
              </button>
              <button
                type="button"
                className="btn ghost extra-small"
                onClick={() => setAmount((parseFloat(debt.monthly_payment) || 0) + 500)}
              >
                +R500 Boost
              </button>
              <button
                type="button"
                className="btn ghost extra-small"
                onClick={() => setAmount(debt.balance)}
              >
                Settle Full ({formatCurrency(debt.balance)})
              </button>
            </div>
          </div>

          <div className="premium-form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Reference / Note</label>
            <input
              type="text"
              className="premium-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DebtForm({ initialData = null, onSubmit, onClose, loading }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    balance: initialData?.balance ?? '',
    interestRate: initialData?.interest_rate ?? '',
    monthlyPayment: initialData?.monthly_payment ?? '',
    type: initialData?.type || 'credit-card',
    creditLimit: initialData?.credit_limit ?? ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const submitData = {
      name: formData.name,
      balance: parseFloat(formData.balance),
      interestRate: parseFloat(formData.interestRate),
      monthlyPayment: parseFloat(formData.monthlyPayment),
      type: formData.type,
      creditLimit: parseFloat(formData.creditLimit) || 0,
    }
    
    onSubmit(submitData)
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-modal shadow-2xl" 
        style={{ maxWidth: '500px', margin: 'auto' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-v2" style={{ padding: '1.5rem 1.5rem 1rem' }}>
          <div className="header-info">
            <h2 style={{ fontSize: '1.4rem', color: 'white', fontWeight: 700, margin: '0 0 4px' }}>
              {initialData ? 'Edit Debt' : 'Add Debt'}
            </h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Track and pay off your debts strategically</p>
          </div>
          <button className="btn ghost small" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 2rem' }}>
          <div className="premium-form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Debt Name</label>
            <input
              type="text"
              name="name"
              className="premium-input"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., FNB Credit Card, WesBank Vehicle Finance, Bash Store Card"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="premium-form-group">
              <label>Current Balance (ZAR)</label>
              <input
                type="number"
                name="balance"
                className="premium-input"
                value={formData.balance}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>

            <div className="premium-form-group">
              <label>Interest Rate (%)</label>
              <input
                type="number"
                name="interestRate"
                className="premium-input"
                value={formData.interestRate}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g. 11.25 or 20.5"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="premium-form-group">
              <label>Monthly Payment (ZAR)</label>
              <input
                type="number"
                name="monthlyPayment"
                className="premium-input"
                value={formData.monthlyPayment}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>

            <div className="premium-form-group">
              <label>Credit Limit (ZAR) - Optional</label>
              <input
                type="number"
                name="creditLimit"
                className="premium-input"
                value={formData.creditLimit}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g. 50000.00"
              />
            </div>
          </div>
          
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '-0.75rem', marginBottom: '1.25rem', display: 'block' }}>
            Essential for accurate Credit Hub utilization and score simulations.
          </p>

          <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Debt Type</label>
            <select name="type" className="premium-input" value={formData.type} onChange={handleChange}>
              <option value="credit-card">Credit Card</option>
              <option value="personal-loan">Personal Loan</option>
              <option value="vehicle-finance">Vehicle Finance (WesBank / MFC / etc.)</option>
              <option value="mortgage">Home Loan / Bond</option>
              <option value="store-card">Store Card (TFG / Bash / Woolworths / Mr Price)</option>
              <option value="bnpl">Buy Now Pay Later (PayJustNow / MoreTyme / Float)</option>
              <option value="student-loan">Student Loan</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading} style={{ minWidth: '110px' }}>
              {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
