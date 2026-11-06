import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calculator,
  DollarSign,
  Download,
  FileText,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  X
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import CSVImport from '../components/CSVImport'
import LoadingSpinner from '../components/LoadingSpinner'
import { taxAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Tax() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showPayslipImport, setShowPayslipImport] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })
  const [taxYear, setTaxYear] = useState(new Date().getFullYear())
  const [calcMode, setCalcMode] = useState('sars') // 'sars' | 'flat'
  const [ageGroup, setAgeGroup] = useState('under65')
  const [medicalMembers, setMedicalMembers] = useState(1)
  const [estimatedTaxRate, setEstimatedTaxRate] = useState(28)
  const [manualIncome, setManualIncome] = useState('')
  const queryClient = useQueryClient()

  const { data: taxData, isLoading } = useQuery({
    queryKey: ['tax-deductions', taxYear],
    queryFn: async () => (await taxAPI.getDeductions(taxYear)).data,
  })

  const { data: taxSummary } = useQuery({
    queryKey: ['tax-summary', taxYear, calcMode, ageGroup, medicalMembers, estimatedTaxRate, manualIncome],
    queryFn: async () =>
      (await taxAPI.getSummary(taxYear, {
        mode: calcMode,
        taxRate: estimatedTaxRate,
        ageGroup,
        medicalMembers,
        manualIncome
      })).data,
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
    setDeleteConfirm({ show: true, id })
  }

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      deleteMutation.mutate(deleteConfirm.id)
    }
  }

  const deductions = taxData?.deductions || []
  const deductionsByCategory = taxData?.byCategory || {}
  const totalDeductions = parseFloat(taxSummary?.totalDeductions || 0)
  const totalIncome = parseFloat(taxSummary?.totalIncome || 0)
  const taxableIncome = parseFloat(taxSummary?.taxableIncome || 0)
  const estimatedTax = parseFloat(taxSummary?.estimatedTax || 0)
  const taxSavings = parseFloat(taxSummary?.taxSavings || 0)
  const effectiveRate = taxSummary?.taxRate ?? estimatedTaxRate
  const marginalRate = taxSummary?.marginalRate ?? estimatedTaxRate
  const medicalCredit = parseFloat(taxSummary?.medicalCredit || 0)
  const raOpt = taxSummary?.raOptimization || {
    contributed: 0,
    maxAllowed: Math.min(350000, totalIncome * 0.275),
    remainingRoom: Math.min(350000, totalIncome * 0.275),
    potentialExtraRefund: 0
  }

  // Export SARS eFiling CSV Pack
  const handleExportSarsPack = () => {
    const rows = [
      ['SARS Tax Year', taxYear],
      ['Gross Annual Income (ZAR)', totalIncome.toFixed(2)],
      ['Total Deductible Expenses (ZAR)', totalDeductions.toFixed(2)],
      ['Taxable Income (ZAR)', taxableIncome.toFixed(2)],
      ['Medical Scheme Credits (Section 6A)', medicalCredit.toFixed(2)],
      ['Estimated Net Tax Payable (ZAR)', estimatedTax.toFixed(2)],
      ['Estimated Tax Refund / Savings (ZAR)', taxSavings.toFixed(2)],
      [],
      ['Date', 'Category', 'Description', 'Amount (ZAR)', 'Receipt / Reference'],
      ...deductions.map(d => [
        new Date(d.date).toISOString().split('T')[0],
        `"${d.category}"`,
        `"${(d.description || '').replace(/"/g, '""')}"`,
        parseFloat(d.amount).toFixed(2),
        `"${(d.receipt || '').replace(/"/g, '""')}"`
      ])
    ]
    const csvContent = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `PaceFinance_SARS_Tax_Pack_${taxYear}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported SARS ${taxYear} Tax Pack!`)
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading SARS tax engine..." />
  }

  const categories = [
    { name: 'Retirement Annuity (RA)', icon: '🛡️', limit: 'Up to 27.5% (Max R350k/yr)', description: 'Section 11F RA & Pension contributions' },
    { name: 'Medical', icon: '🏥', limit: 'Section 6A & 6B Credits', description: 'Medical aid contributions & out-of-pocket scripts' },
    { name: 'Home Office', icon: '🏠', limit: 'Floor-area pro-rata', description: 'Dedicated workspace rent, fibre & Eskom electricity' },
    { name: 'Charitable Donations', icon: '❤️', limit: 'Section 18A (Up to 10%)', description: 'Donations to SARS PBO-registered organizations' },
    { name: 'Business Expenses', icon: '💼', limit: 'Section 11(a) Trade', description: 'Travel logbook, equipment, courses, professional fees' },
  ]

  return (
    <div className="tax-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info">
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
            SARS Tax Planning & Deductions
          </h1>
          <p className="text-muted">Official South African progressive tax brackets, Section 11F RA optimizer & deduction tracker</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn ghost extra-small"
            style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => setShowPayslipImport(true)}
          >
            <Upload size={16} />
            Upload Payslip
          </button>
          <button
            className="btn ghost extra-small"
            style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={handleExportSarsPack}
          >
            <Download size={16} />
            Export SARS Pack
          </button>
          <button
            className="btn primary extra-small"
            style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} />
            Add Deduction
          </button>
        </div>
      </header>

      {/* SARS Mode & Profile Controls */}
      <div className="tax-controls-v2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="tax-control-group-v2">
          <label>Tax Year</label>
          <select value={taxYear} onChange={(e) => setTaxYear(parseInt(e.target.value))}>
            {[2026, 2025, 2024, 2023].map(year => (
              <option key={year} value={year}>{year} / {year + 1}</option>
            ))}
          </select>
        </div>

        <div className="tax-control-group-v2">
          <label>Calculation Engine</label>
          <select value={calcMode} onChange={(e) => setCalcMode(e.target.value)}>
            <option value="sars">🇿🇦 SARS Progressive Brackets</option>
            <option value="flat">Custom Flat Tax Rate</option>
          </select>
        </div>

        {calcMode === 'sars' ? (
          <>
            <div className="tax-control-group-v2">
              <label>Taxpayer Age Group</label>
              <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                <option value="under65">Under 65 (Primary R17,235)</option>
                <option value="65to74">65 – 74 (+Secondary R9,444)</option>
                <option value="75plus">75+ (+Tertiary R3,145)</option>
              </select>
            </div>
            <div className="tax-control-group-v2">
              <label>Medical Aid Members (MTC)</label>
              <select value={medicalMembers} onChange={(e) => setMedicalMembers(parseInt(e.target.value))}>
                <option value={0}>0 (No Medical Aid)</option>
                <option value={1}>1 (Main Member — R364/pm)</option>
                <option value={2}>2 (Main + 1 Dep — R728/pm)</option>
                <option value={3}>3 (Main + 2 Dep — R974/pm)</option>
                <option value={4}>4 (Main + 3 Dep — R1,220/pm)</option>
                <option value={5}>5+ Members</option>
              </select>
            </div>
          </>
        ) : (
          <div className="tax-control-group-v2">
            <label>Custom Tax Rate (%)</label>
            <input
              type="number"
              value={estimatedTaxRate}
              onChange={(e) => setEstimatedTaxRate(parseFloat(e.target.value) || 0)}
              step="0.5"
              min="0"
              max="45"
            />
          </div>
        )}

        <div className="tax-control-group-v2">
          <label>Annual Gross Income Override (Optional)</label>
          <input
            type="number"
            placeholder={totalIncome > 0 ? `Auto: R${totalIncome.toLocaleString()}` : 'e.g. 650000'}
            value={manualIncome}
            onChange={(e) => setManualIncome(e.target.value)}
            step="1000"
            min="0"
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
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>{deductions.length} logged items</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
          <div className="intel-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Calculator size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Tax Savings & Credits</span>
            <span className="intel-value" style={{ color: '#10b981', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(taxSavings)}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              {calcMode === 'sars' ? `Includes ${formatCurrency(medicalCredit)} MTC` : `At ${effectiveRate}% rate`}
            </span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <TrendingUp size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Taxable Income</span>
            <span className="intel-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(taxableIncome)}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              Marginal Bracket: {marginalRate}%
            </span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <FileText size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Estimated Net Tax</span>
            <span className="intel-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginTop: '0.25rem' }}>{formatCurrency(estimatedTax)}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              Effective Rate: {effectiveRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Section 11F Retirement Annuity (RA) Optimizer Banner */}
      <div
        className="glass-panel shadow-2xl"
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(79, 140, 255, 0.06) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
            <ShieldCheck size={15} /> SARS Section 11F Retirement Annuity Optimizer
          </div>
          <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            Deduct up to 27.5% of your income ({formatCurrency(raOpt.maxAllowed)} max cap)
          </h3>
          <p className="text-muted" style={{ fontSize: '0.88rem', margin: 0 }}>
            You have contributed <strong>{formatCurrency(raOpt.contributed)}</strong> to an RA this tax year.
            {parseFloat(raOpt.remainingRoom) > 0
              ? ` Contributing your remaining ${formatCurrency(raOpt.remainingRoom)} allowance could unlock up to ${formatCurrency(raOpt.potentialExtraRefund)} in additional SARS tax refunds!`
              : ' You have maximized your Section 11F RA tax deduction for the year!'}
          </p>
        </div>
        <button
          className="btn primary small"
          onClick={() => setShowAddForm(true)}
          style={{ borderRadius: '10px' }}
        >
          <Sparkles size={15} /> Log RA Contribution
        </button>
      </div>

      {/* Deductions by Category Grid */}
      <div style={{ marginTop: '2.5rem' }}>
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
                  {new Date(deduction.date).toLocaleDateString('en-ZA')}
                </div>
                <div className="col-description" style={{ color: '#e2e8f0', fontWeight: 500 }}>
                  {deduction.description}
                  {deduction.receipt && (
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Ref: {deduction.receipt}</span>
                  )}
                </div>
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
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Log your RA contributions, medical out-of-pocket costs, home office, or Section 18A donations</p>
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

      {/* Payslip / Statement Scanner Modal */}
      {showPayslipImport && (
        <CSVImport
          onClose={() => setShowPayslipImport(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['tax-deductions'] })
            queryClient.invalidateQueries({ queryKey: ['tax-summary'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Remove Tax Deduction"
        message="Are you sure you want to remove this tax deduction?"
        confirmText="Remove"
        type="danger"
      />
    </div>
  )
}

function DeductionForm({ onSubmit, onClose, loading }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Retirement Annuity (RA)',
    date: new Date().toISOString().split('T')[0],
    receipt: '',
  })

  const categories = [
    'Retirement Annuity (RA)',
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
      <div
        className="modal-content glass-modal shadow-2xl"
        style={{ maxWidth: '500px', margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-v2" style={{ padding: '1.5rem 1.5rem 1rem' }}>
          <div className="header-info">
            <h2 style={{ fontSize: '1.4rem', color: 'white', fontWeight: 700, margin: '0 0 4px' }}>Add Tax Deduction</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Record a SARS-deductible expense or contribution</p>
          </div>
          <button className="btn ghost small" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 2rem' }}>
          <div className="premium-form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Description</label>
            <input
              type="text"
              name="description"
              className="premium-input"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Sygnia / Allan Gray RA, Discovery Medical Script, Fibre Home Office"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="premium-form-group">
              <label>Amount (ZAR)</label>
              <input
                type="number"
                name="amount"
                className="premium-input"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>

            <div className="premium-form-group">
              <label>SARS Category</label>
              <select name="category" className="premium-input" value={formData.category} onChange={handleChange}>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="premium-form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                className="premium-input"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="premium-form-group">
              <label>IT3(f) / Receipt Ref (Optional)</label>
              <input
                type="text"
                name="receipt"
                className="premium-input"
                value={formData.receipt}
                onChange={handleChange}
                placeholder="Certificate or invoice #"
              />
            </div>
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
