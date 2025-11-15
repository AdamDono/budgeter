import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '../utils/format'
import { Plus, Trash2, TrendingDown, Calendar, DollarSign } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

// Mock API for debts (would be real API in production)
const debtsAPI = {
  getAll: () => Promise.resolve({ data: { debts: [] } }),
  create: (data) => Promise.resolve({ data: { debt: data } }),
  delete: (id) => Promise.resolve({ data: {} }),
}

export default function Debt() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [debts, setDebts] = useState([])
  const [payoffStrategy, setPayoffStrategy] = useState('snowball') // snowball or avalanche

  const createMutation = useMutation({
    mutationFn: debtsAPI.create,
    onSuccess: (res) => {
      setDebts([...debts, res.data.debt])
      setShowAddForm(false)
      toast.success('Debt added successfully!')
    },
    onError: () => toast.error('Failed to add debt'),
  })

  const deleteMutation = useMutation({
    mutationFn: debtsAPI.delete,
    onSuccess: (_, debtId) => {
      setDebts(debts.filter(d => d.id !== debtId))
      toast.success('Debt removed!')
    },
    onError: () => toast.error('Failed to remove debt'),
  })

  const handleAddDebt = (formData) => {
    createMutation.mutate(formData)
  }

  const handleDeleteDebt = (id) => {
    if (confirm('Remove this debt?')) {
      deleteMutation.mutate(id)
    }
  }

  // Calculate payoff plans
  const calculatePayoffPlan = () => {
    if (debts.length === 0) return null

    // Sort by strategy
    const sorted = [...debts].sort((a, b) => {
      if (payoffStrategy === 'snowball') {
        return a.balance - b.balance // Pay smallest first
      } else {
        return b.interestRate - a.interestRate // Pay highest interest first
      }
    })

    let totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
    let totalInterest = 0
    let months = 0
    const plan = []

    sorted.forEach(debt => {
      const monthlyPayment = debt.monthlyPayment
      let balance = debt.balance
      let debtMonths = 0
      let debtInterest = 0

      while (balance > 0) {
        const interest = (balance * debt.interestRate) / 100 / 12
        balance -= monthlyPayment - interest
        debtInterest += interest
        debtMonths++
        if (debtMonths > 600) break // Safety limit
      }

      plan.push({
        ...debt,
        payoffMonths: debtMonths,
        totalInterest: debtInterest,
      })

      months = Math.max(months, debtMonths)
      totalInterest += debtInterest
    })

    return { plan, months, totalInterest, totalDebt }
  }

  const payoffPlan = calculatePayoffPlan()
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)

  return (
    <div className="debt-page">
      <div className="page-header">
        <div>
          <h1>Debt Management</h1>
          <p>Track and pay off your debts strategically</p>
        </div>
        <button
          className="btn primary"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={16} />
          Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="debt-summary">
        <div className="summary-card">
          <DollarSign size={24} />
          <div>
            <h3>Total Debt</h3>
            <p className="amount">{formatCurrency(totalDebt)}</p>
          </div>
        </div>

        <div className="summary-card">
          <TrendingDown size={24} />
          <div>
            <h3>Monthly Payment</h3>
            <p className="amount">{formatCurrency(totalMonthlyPayment)}</p>
          </div>
        </div>

        <div className="summary-card">
          <Calendar size={24} />
          <div>
            <h3>Payoff Timeline</h3>
            <p className="amount">
              {payoffPlan ? `${payoffPlan.months} months` : 'N/A'}
            </p>
          </div>
        </div>

        <div className="summary-card">
          <DollarSign size={24} />
          <div>
            <h3>Total Interest</h3>
            <p className="amount">
              {payoffPlan ? formatCurrency(payoffPlan.totalInterest) : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Payoff Strategy Selector */}
      {debts.length > 0 && (
        <div className="strategy-selector">
          <h3>Payoff Strategy</h3>
          <div className="strategy-buttons">
            <button
              className={`strategy-btn ${payoffStrategy === 'snowball' ? 'active' : ''}`}
              onClick={() => setPayoffStrategy('snowball')}
            >
              <h4>Snowball Method</h4>
              <p>Pay smallest debt first for quick wins</p>
            </button>
            <button
              className={`strategy-btn ${payoffStrategy === 'avalanche' ? 'active' : ''}`}
              onClick={() => setPayoffStrategy('avalanche')}
            >
              <h4>Avalanche Method</h4>
              <p>Pay highest interest first to save money</p>
            </button>
          </div>
        </div>
      )}

      {/* Debts List */}
      <div className="debts-section">
        <h2>Your Debts</h2>
        {debts.length > 0 ? (
          <div className="debts-grid">
            {debts.map((debt, idx) => {
              const payoffInfo = payoffPlan?.plan[idx]
              return (
                <div key={debt.id} className="debt-card">
                  <div className="debt-header">
                    <h3>{debt.name}</h3>
                    <button
                      className="btn ghost small"
                      onClick={() => handleDeleteDebt(debt.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="debt-details">
                    <div className="detail-row">
                      <span>Balance:</span>
                      <strong>{formatCurrency(debt.balance)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Interest Rate:</span>
                      <strong>{debt.interestRate}%</strong>
                    </div>
                    <div className="detail-row">
                      <span>Monthly Payment:</span>
                      <strong>{formatCurrency(debt.monthlyPayment)}</strong>
                    </div>
                  </div>

                  {payoffInfo && (
                    <div className="payoff-info">
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

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, (debt.monthlyPayment / debt.balance * 100))}%`
                      }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <TrendingDown size={48} />
            <h3>No Debts Tracked</h3>
            <p>Add your debts to create a payoff plan</p>
            <button
              className="btn primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Your First Debt
            </button>
          </div>
        )}
      </div>

      {/* Payoff Plan */}
      {payoffPlan && (
        <div className="payoff-plan-section">
          <h2>Payoff Plan ({payoffStrategy === 'snowball' ? 'Snowball' : 'Avalanche'})</h2>
          <div className="payoff-timeline">
            <p className="timeline-summary">
              Pay off all debts in <strong>{payoffPlan.months} months</strong> with total interest of <strong>{formatCurrency(payoffPlan.totalInterest)}</strong>
            </p>
            <div className="timeline-items">
              {payoffPlan.plan.map((debt, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>{debt.name}</h4>
                    <p>
                      {debt.payoffMonths} months • Interest: {formatCurrency(debt.totalInterest)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  )
}

function DebtForm({ onSubmit, onClose, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    balance: '',
    interestRate: '',
    monthlyPayment: '',
    type: 'credit-card' // credit-card, personal-loan, student-loan, mortgage
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      id: Date.now(),
      ...formData,
      balance: parseFloat(formData.balance),
      interestRate: parseFloat(formData.interestRate),
      monthlyPayment: parseFloat(formData.monthlyPayment),
    })
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
