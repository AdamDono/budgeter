import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { formatCurrency } from '../utils/format'
import { Plus, Trash2, FileText, DollarSign, TrendingUp, Calculator } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

// Mock API for tax deductions
const taxAPI = {
  getAll: () => Promise.resolve({ data: { deductions: [] } }),
  create: (data) => Promise.resolve({ data: { deduction: data } }),
  delete: (id) => Promise.resolve({ data: {} }),
}

export default function Tax() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [deductions, setDeductions] = useState([])
  const [taxYear, setTaxYear] = useState(new Date().getFullYear())
  const [estimatedTaxRate, setEstimatedTaxRate] = useState(28) // SA standard rate

  const createMutation = useMutation({
    mutationFn: taxAPI.create,
    onSuccess: (res) => {
      setDeductions([...deductions, res.data.deduction])
      setShowAddForm(false)
      toast.success('Deduction added!')
    },
    onError: () => toast.error('Failed to add deduction'),
  })

  const deleteMutation = useMutation({
    mutationFn: taxAPI.delete,
    onSuccess: (_, deductionId) => {
      setDeductions(deductions.filter(d => d.id !== deductionId))
      toast.success('Deduction removed!')
    },
    onError: () => toast.error('Failed to remove deduction'),
  })

  const handleAddDeduction = (formData) => {
    createMutation.mutate(formData)
  }

  const handleDeleteDeduction = (id) => {
    if (confirm('Remove this deduction?')) {
      deleteMutation.mutate(id)
    }
  }

  // Calculate tax metrics
  const totalIncome = 0 // Would come from transactions
  const totalDeductions = deductions.reduce((sum, d) => sum + parseFloat(d.amount), 0)
  const taxableIncome = Math.max(0, totalIncome - totalDeductions)
  const estimatedTax = (taxableIncome * estimatedTaxRate) / 100
  const taxSavings = (totalDeductions * estimatedTaxRate) / 100

  // Group deductions by category
  const deductionsByCategory = deductions.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  const categories = [
    { name: 'Medical', icon: '🏥', limit: 'Unlimited' },
    { name: 'Education', icon: '🎓', limit: 'Unlimited' },
    { name: 'Home Office', icon: '🏠', limit: 'Reasonable' },
    { name: 'Vehicle', icon: '🚗', limit: 'Business use' },
    { name: 'Professional Fees', icon: '💼', limit: 'Unlimited' },
    { name: 'Donations', icon: '❤️', limit: '10% of income' },
    { name: 'Insurance', icon: '🛡️', limit: 'Unlimited' },
    { name: 'Other', icon: '📋', limit: 'Varies' },
  ]

  return (
    <div className="tax-page">
      <div className="page-header">
        <div>
          <h1>Tax Planning & Deductions</h1>
          <p>Track deductible expenses and estimate your tax liability</p>
        </div>
        <button
          className="btn primary"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={16} />
          Add Deduction
        </button>
      </div>

      {/* Tax Year & Rate Selector */}
      <div className="tax-controls">
        <div className="control-group">
          <label>Tax Year</label>
          <select value={taxYear} onChange={(e) => setTaxYear(parseInt(e.target.value))}>
            {[2024, 2023, 2022, 2021].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Estimated Tax Rate (%)</label>
          <input
            type="number"
            value={estimatedTaxRate}
            onChange={(e) => setEstimatedTaxRate(parseFloat(e.target.value))}
            step="0.1"
            min="0"
            max="100"
          />
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div className="tax-summary">
        <div className="summary-card">
          <DollarSign size={24} />
          <div>
            <h3>Total Deductions</h3>
            <p className="amount">{formatCurrency(totalDeductions)}</p>
            <span className="subtitle">{deductions.length} items</span>
          </div>
        </div>

        <div className="summary-card">
          <Calculator size={24} />
          <div>
            <h3>Estimated Tax Savings</h3>
            <p className="amount positive">{formatCurrency(taxSavings)}</p>
            <span className="subtitle">At {estimatedTaxRate}% rate</span>
          </div>
        </div>

        <div className="summary-card">
          <TrendingUp size={24} />
          <div>
            <h3>Taxable Income</h3>
            <p className="amount">{formatCurrency(taxableIncome)}</p>
            <span className="subtitle">After deductions</span>
          </div>
        </div>

        <div className="summary-card">
          <FileText size={24} />
          <div>
            <h3>Estimated Tax</h3>
            <p className="amount">{formatCurrency(estimatedTax)}</p>
            <span className="subtitle">To be paid</span>
          </div>
        </div>
      </div>

      {/* Deductions by Category */}
      <div className="deductions-section">
        <h2>Deductions by Category</h2>
        <div className="categories-grid">
          {categories.map(cat => {
            const catDeductions = deductionsByCategory[cat.name] || []
            const catTotal = catDeductions.reduce((sum, d) => sum + parseFloat(d.amount), 0)
            return (
              <div key={cat.name} className="category-card">
                <div className="category-header">
                  <span className="category-icon">{cat.icon}</span>
                  <div>
                    <h4>{cat.name}</h4>
                    <p className="category-limit">{cat.limit}</p>
                  </div>
                </div>
                <div className="category-amount">
                  <p className="amount">{formatCurrency(catTotal)}</p>
                  <p className="count">{catDeductions.length} items</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deductions List */}
      <div className="deductions-list-section">
        <h2>All Deductions</h2>
        {deductions.length > 0 ? (
          <div className="deductions-table">
            <div className="table-header">
              <div className="col-date">Date</div>
              <div className="col-description">Description</div>
              <div className="col-category">Category</div>
              <div className="col-amount">Amount</div>
              <div className="col-action">Action</div>
            </div>
            {deductions.map(deduction => (
              <div key={deduction.id} className="table-row">
                <div className="col-date">
                  {new Date(deduction.date).toLocaleDateString()}
                </div>
                <div className="col-description">{deduction.description}</div>
                <div className="col-category">
                  <span className="category-badge">{deduction.category}</span>
                </div>
                <div className="col-amount">{formatCurrency(deduction.amount)}</div>
                <div className="col-action">
                  <button
                    className="btn ghost small"
                    onClick={() => handleDeleteDeduction(deduction.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No Deductions Tracked</h3>
            <p>Add deductible expenses to reduce your tax liability</p>
            <button
              className="btn primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Your First Deduction
            </button>
          </div>
        )}
      </div>

      {/* Tax Tips */}
      <div className="tax-tips-section">
        <h2>SA Tax Deduction Tips</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <h4>📚 Education</h4>
            <p>Tuition, books, and courses for professional development are deductible.</p>
          </div>
          <div className="tip-card">
            <h4>🏠 Home Office</h4>
            <p>Portion of rent/mortgage, utilities, and internet if you work from home.</p>
          </div>
          <div className="tip-card">
            <h4>🚗 Vehicle</h4>
            <p>Mileage for business use, maintenance, and fuel are deductible.</p>
          </div>
          <div className="tip-card">
            <h4>💼 Professional Fees</h4>
            <p>Accounting, legal, and consulting fees for business purposes.</p>
          </div>
          <div className="tip-card">
            <h4>🏥 Medical</h4>
            <p>Medical expenses and health insurance premiums may be deductible.</p>
          </div>
          <div className="tip-card">
            <h4>❤️ Donations</h4>
            <p>Charitable donations to registered NPOs up to 10% of taxable income.</p>
          </div>
        </div>
      </div>

      {/* Add Deduction Modal */}
      {showAddForm && (
        <DeductionForm
          onSubmit={handleAddDeduction}
          onClose={() => setShowAddForm(false)}
          loading={createMutation.isPending}
        />
      )}
    </div>
  )
}

function DeductionForm({ onSubmit, onClose, loading }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    receipt: '',
  })

  const categories = [
    'Medical',
    'Education',
    'Home Office',
    'Vehicle',
    'Professional Fees',
    'Donations',
    'Insurance',
    'Other'
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      id: Date.now(),
      ...formData,
      amount: parseFloat(formData.amount),
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
          <h2>Add Tax Deduction</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="deduction-form">
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Professional course, Office supplies"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Amount (ZAR)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Receipt/Reference (Optional)</label>
            <input
              type="text"
              name="receipt"
              value={formData.receipt}
              onChange={handleChange}
              placeholder="Invoice number or reference"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Deduction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
