import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calculator, DollarSign, FileText, Plus, Trash2, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import { taxAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Tax() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [taxYear, setTaxYear] = useState(new Date().getFullYear())
  const [estimatedTaxRate, setEstimatedTaxRate] = useState(28)
  const queryClient = useQueryClient()

  const { data: taxData, isLoading } = useQuery({
    queryKey: ['tax-deductions', taxYear],
    queryFn: async () => (await taxAPI.getDeductions(taxYear)).data,
  })

  const { data: taxSummary } = useQuery({
    queryKey: ['tax-summary', taxYear, estimatedTaxRate],
    queryFn: async () => (await taxAPI.getSummary(taxYear, estimatedTaxRate)).data,
  })

  const createMutation = useMutation({
    mutationFn: (data) => taxAPI.createDeduction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-deductions'] })
      queryClient.invalidateQueries({ queryKey: ['tax-summary'] })
      setShowAddForm(false)
      toast.success('Deduction added!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add deduction')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => taxAPI.deleteDeduction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-deductions'] })
      queryClient.invalidateQueries({ queryKey: ['tax-summary'] })
      toast.success('Deduction removed!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to remove deduction')
    }
  })

  const handleAddDeduction = (formData) => {
    createMutation.mutate(formData)
  }

  const handleDeleteDeduction = (id) => {
    if (confirm('Remove this deduction?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading tax data..." />
  }

  const deductions = taxData?.deductions || []
  const deductionsByCategory = taxData?.byCategory || {}
  const totalDeductions = taxSummary?.totalDeductions || 0
  const totalIncome = taxSummary?.totalIncome || 0
  const taxableIncome = taxSummary?.taxableIncome || 0
  const estimatedTax = taxSummary?.estimatedTax || 0
  const taxSavings = taxSummary?.taxSavings || 0

  const categories = [
    { name: 'Medical', icon: '🏥', limit: 'Medical expenses & insurance', description: 'Doctor visits, prescriptions, medical aid' },
    { name: 'Home Office', icon: '🏠', limit: 'Reasonable portion', description: 'Rent, utilities, internet for work from home' },
    { name: 'Charitable Donations', icon: '❤️', limit: 'Up to 10% of income', description: 'Donations to registered NPOs' },
    { name: 'Business Expenses', icon: '💼', limit: 'Business-related only', description: 'Courses, equipment, professional fees, vehicle' },
  ]

  return (
    <div className="tax-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info">
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>Tax Planning & Deductions</h1>
          <p className="text-muted">Track deductible expenses and estimate your tax liability</p>
        </div>
        <button
          className="btn primary extra-small"
          style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={16} />
          Add Deduction
        </button>
      </header>

      {/* Tax Year & Rate Selector */}
      <div className="tax-controls-v2">
        <div className="tax-control-group-v2">
          <label>Tax Year</label>
          <select value={taxYear} onChange={(e) => setTaxYear(parseInt(e.target.value))}>
            {[2026, 2025, 2024, 2023].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="tax-control-group-v2">
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

      {/* High-Fidelity Tax Intel Cards */}
      <div className="analytics-summary-stats">
        <div className="intel-block glass-panel highlight" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <DollarSign size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Total Deductions</span>
            <span className="intel-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(totalDeductions)}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>{deductions.length} items</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
          <div className="intel-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Calculator size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Estimated Tax Savings</span>
            <span className="intel-value" style={{ color: '#10b981', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(taxSavings)}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>At {estimatedTaxRate}% rate</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <TrendingUp size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Taxable Income</span>
            <span className="intel-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(taxableIncome)}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>After deductions</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <FileText size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Estimated Tax</span>
            <span className="intel-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(estimatedTax)}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>To be paid</span>
          </div>
        </div>
      </div>

      {/* Deductions by Category Grid */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>Deductions by Category</h2>
        <div className="tax-categories-grid-v2">
          {categories.map(cat => {
            const catDeductions = deductionsByCategory[cat.name] || []
            const catTotal = catDeductions.reduce((sum, d) => sum + parseFloat(d.amount), 0)
            return (
              <div key={cat.name} className="tax-category-card-v2 shadow-2xl">
                <div className="tax-cat-header-v2">
                  <span className="tax-cat-icon-v2">{cat.icon}</span>
                  <div className="tax-cat-title-v2">
                    <h4>{cat.name}</h4>
                    <p>{cat.limit}</p>
                  </div>
                </div>
                <div className="tax-cat-amount-v2">
                  <p className="amount">{formatCurrency(catTotal)}</p>
                  <p className="count">{catDeductions.length} items</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modern Deductions List */}
      <div className="tax-list-section-v2 shadow-2xl">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>All Deductions</h2>
        {deductions.length > 0 ? (
          <div className="deductions-table" style={{ background: 'transparent', border: 'none', padding: 0 }}>
            <div className="table-header" style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div className="col-date">Date</div>
              <div className="col-description">Description</div>
              <div className="col-category">Category</div>
              <div className="col-amount">Amount</div>
              <div className="col-action">Action</div>
            </div>
            {deductions.map(deduction => (
              <div key={deduction.id} className="table-row" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div className="col-date" style={{ color: '#94a3b8' }}>
                  {new Date(deduction.date).toLocaleDateString()}
                </div>
                <div className="col-description" style={{ color: '#e2e8f0', fontWeight: 500 }}>{deduction.description}</div>
                <div className="col-category">
                  <span className="category-badge" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff', border: '1px solid rgba(79, 140, 255, 0.2)' }}>{deduction.category}</span>
                </div>
                <div className="col-amount" style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#f1f5f9' }}>{formatCurrency(deduction.amount)}</div>
                <div className="col-action">
                  <button
                    className="btn ghost extra-small"
                    style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)' }}
                    onClick={() => handleDeleteDeduction(deduction.id)}
                  >
                    <Trash2 size={14} color="#94a3b8" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="savings-empty-state">
            <div className="empty-pot-icon">
              <FileText size={32} />
            </div>
            <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>No Deductions Tracked</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Add deductible expenses to reduce your tax liability</p>
            <button
              className="btn primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Your First Deduction
            </button>
          </div>
        )}
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
    category: 'Medical',
    date: new Date().toISOString().split('T')[0],
    receipt: '',
  })

  const categories = [
    'Medical',
    'Home Office',
    'Charitable Donations',
    'Business Expenses'
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const submitData = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: formData.date,
      receipt: formData.receipt || null,
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
