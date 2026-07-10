import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, CheckCircle, DollarSign, Plus, Trash2, TrendingDown } from 'lucide-react'
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

export default function Debt() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })
  const [payoffStrategy, setPayoffStrategy] = useState('snowball')
  const queryClient = useQueryClient()

  const { data: debtsData, isLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => (await debtsAPI.getAll()).data,
  })

  const { data: payoffPlanData } = useQuery({
    queryKey: ['payoff-plan', payoffStrategy],
    queryFn: async () => (await debtsAPI.calculatePayoff(payoffStrategy)).data,
  })

  const createMutation = useMutation({
    mutationFn: debtsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['payoff-plan'] })
      setShowAddForm(false)
      toast.success('Debt added successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add debt')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: debtsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['payoff-plan'] })
      toast.success('Debt removed!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to remove debt')
    }
  })

  const handleAddDebt = (formData) => {
    createMutation.mutate(formData)
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
  const simulatePayoff = (debtsList, strategy) => {
    if (debtsList.length === 0) return []
    const debts = debtsList.map(d => ({
      name: d.name,
      balance: parseFloat(d.balance),
      rate: (parseFloat(d.interest_rate) || 0) / 100 / 12,
      minPayment: parseFloat(d.monthly_payment) || 10 // avoid zero
    }))

    const totalMinPayment = debts.reduce((sum, d) => sum + d.minPayment, 0)
    // Rollover budget is the total minimums plus R500 speed rollover
    const monthlyBudget = totalMinPayment + 500

    let month = 0
    const history = [debts.reduce((sum, d) => sum + d.balance, 0)]

    while (month < 120) {
      let activeDebts = debts.filter(d => d.balance > 0)
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

      // Funnel any extra budget into target debt
      if (remainingBudget > 0 && activeDebts.length > 0) {
        const target = activeDebts[0]
        const extraPayment = Math.min(target.balance, remainingBudget)
        target.balance -= extraPayment
      }

      const currentTotal = debts.reduce((sum, d) => sum + d.balance, 0)
      history.push(currentTotal)
      if (currentTotal <= 0) break
      month++
    }

    // Pad if timeline finishes early to compare visually
    return history
  }

  const snowballTimeline = simulatePayoff(debts, 'snowball')
  const avalancheTimeline = simulatePayoff(debts, 'avalanche')

  const chartData = {
    labels: Array.from(
      { length: Math.max(snowballTimeline.length, avalancheTimeline.length) },
      (_, i) => `Month ${i}`
    ),
    datasets: [
      {
        label: 'Snowball Method',
        data: snowballTimeline,
        borderColor: '#4f8cff',
        backgroundColor: 'rgba(79, 140, 255, 0.05)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        fill: true,
      },
      {
        label: 'Avalanche Method',
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
          <p className="text-muted dash-subtitle">Track and pay off your debts strategically</p>
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
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Monthly Payment</span>
            <span className="intel-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(totalMonthlyPayment)}</span>
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
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <DollarSign size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Total Interest</span>
            <span className="intel-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>
              {payoffPlan ? formatCurrency(payoffPlan.totalInterest) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Payoff Strategy Selector */}
      {debts.length > 0 && (
        <div className="payoff-plan-v2">
          <div className="card-v2-header">
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Payoff Strategy</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>Rollover projection assumes R500 extra contribution monthly</p>
            </div>
          </div>
          <div className="strategy-row-v2" style={{ marginBottom: '1.5rem' }}>
            <div
              className={`strategy-btn-v2 ${payoffStrategy === 'snowball' ? 'active' : ''}`}
              onClick={() => setPayoffStrategy('snowball')}
            >
              <h4>Snowball Method</h4>
              <p>Pay smallest debt first for quick wins</p>
            </div>
            <div
              className={`strategy-btn-v2 ${payoffStrategy === 'avalanche' ? 'active' : ''}`}
              onClick={() => setPayoffStrategy('avalanche')}
            >
              <h4>Avalanche Method</h4>
              <p>Pay highest interest first to save money</p>
            </div>
          </div>
          
          {/* Visual Timelines Comparison Chart */}
          <div className="visual-payoff-chart-container" style={{ height: '300px', width: '100%', marginTop: '2rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
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
          <div className="goals-glass-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', display: 'grid', gap: '1.5rem' }}>
            {debts.map((debt, idx) => {
              const payoffInfo = payoffPlan?.plan[idx]
              const isPaidOff = parseFloat(debt.balance) <= 0
              return (
                <div key={debt.id} className={`debt-glass-card shadow-2xl ${isPaidOff ? 'paid-off' : ''}`}>
                  <div className="debt-card-header-v2">
                    <h3>{debt.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isPaidOff && <CheckCircle size={18} className="text-pos" />}
                      <button
                        className="btn ghost extra-small"
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
                  </div>

                  {payoffInfo && (
                    <div className="debt-payoff-info-v2">
                      <div className="payoff-row">
                        <span>Payoff Time:</span>
                        <strong>{payoffInfo.payoffMonths} months</strong>
                      </div>
                      <div className="payoff-row">
                        <span>Total Interest:</span>
                        <strong>{formatCurrency(payoffInfo.totalInterest)}</strong>
                      </div>
                    </div>
                  )}

                  <div className="debt-progress-v2" style={{ marginTop: 'auto' }}>
                    <div
                      className="debt-progress-fill-v2"
                      style={{
                        width: `${Math.min(100, ((parseFloat(debt.monthly_payment) || 0) / (parseFloat(debt.balance) || 1) * 100))}%`
                      }}
                    ></div>
                  </div>
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
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Add your debts to create a payoff plan</p>
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

function DebtForm({ onSubmit, onClose, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    balance: '',
    interestRate: '',
    monthlyPayment: '',
    type: 'credit-card',
    creditLimit: ''
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Debt</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="debt-form">
          <div className="form-group">
            <label>Debt Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Credit Card, Car Loan"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Current Balance (ZAR)</label>
              <input
                type="number"
                name="balance"
                value={formData.balance}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Interest Rate (%)</label>
              <input
                type="number"
                name="interestRate"
                value={formData.interestRate}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Monthly Payment (ZAR)</label>
            <input
              type="number"
              name="monthlyPayment"
              value={formData.monthlyPayment}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label>Credit Limit (ZAR) - Optional</label>
            <input
              type="number"
              name="creditLimit"
              value={formData.creditLimit}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="e.g. 50000.00"
            />
            <p className="form-help">Essential for accurate credit utilization boost.</p>
          </div>

          <div className="form-group">
            <label>Debt Type</label>
            <select name="type" value={formData.type} onChange={handleChange}>
              <option value="credit-card">Credit Card</option>
              <option value="personal-loan">Personal Loan</option>
              <option value="student-loan">Student Loan</option>
              <option value="mortgage">Mortgage</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
