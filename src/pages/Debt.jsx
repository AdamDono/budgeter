import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, CheckCircle, DollarSign, Plus, Trash2, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { debtsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

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

  return (
    <div className="debt-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info">
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>Debt Management</h1>
          <p className="text-muted">Track and pay off your debts strategically</p>
        </div>
        <button
          className="btn primary extra-small"
          style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={16} />
          Add Debt
        </button>
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>Payoff Strategy</h2>
            </div>
          </div>
          <div className="strategy-row-v2">
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
