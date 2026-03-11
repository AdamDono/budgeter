import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, FileText, Plus, Search, Trash2, TrendingUp, TrendingDown, ArrowRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import CSVImport from '../components/CSVImport'
import LoadingSpinner from '../components/LoadingSpinner'
import { budgetsAPI, debtsAPI, goalsAPI, savingsAPI, transactionsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Transactions() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filters, setFilters] = useState({
    type: 'all',
    categoryId: 'all',
    search: '',
    startDate: '',
    endDate: ''
  })
  const [page, setPage] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })
  
  const queryClient = useQueryClient()

  // Update filters when month changes
  useEffect(() => {
    const [year, month] = selectedMonth.split('-')
    const startDate = `${year}-${month}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]
    setFilters(prev => ({ ...prev, startDate, endDate }))
    setPage(1)
  }, [selectedMonth])

  // Queries
  const { data: transactionsData, isLoading, error: txError } = useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: async () => {
      const response = await transactionsAPI.getAll({ ...filters, page, limit: 10 })
      return response.data
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await budgetsAPI.getCategories()).data,
  })

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => (await goalsAPI.getAll()).data,
  })

  const { data: debts } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => (await debtsAPI.getAll()).data,
  })

  const { data: savings } = useQuery({
    queryKey: ['savings'],
    queryFn: async () => (await savingsAPI.getAll()).data,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: transactionsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowAddForm(false)
      toast.success('Transaction added successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add transaction')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: transactionsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete transaction')
    }
  })

  const handleAddTransaction = (formData) => {
    createMutation.mutate(formData)
  }

  const handleDeleteTransaction = (id) => {
    setDeleteConfirm({ show: true, id })
  }

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      deleteMutation.mutate(deleteConfirm.id)
    }
  }

  const transactions = transactionsData?.transactions || []
  const pagination = transactionsData?.pagination || {}

  if (isLoading) {
    return (
      <div className="dashboard-v2 transactions-page-v2">
        <LoadingSpinner text="Retrieving Transaction History..." />
      </div>
    )
  }

  return (
    <div className="dashboard-v2 transactions-page-v2">
      {/* Background Glows */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <header className="dash-header">
        <div className="header-info">
          <h1>Transactions</h1>
          <p className="text-muted">History for {new Date(selectedMonth + '-01').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="header-actions">
           <button 
            className="btn ghost"
            onClick={() => setShowImport(true)}
          >
            <FileText size={16} /> Import
          </button>
          <button 
            className="btn primary"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={18} /> New Transaction
          </button>
        </div>
      </header>

      {/* Filters Glass Panel */}
      <div className="filters-glass glass-panel shadow-lg">
        <div className="filter-item">
          <label>Transaction Type</label>
          <select 
            className="filter-input"
            value={filters.type} 
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="all">All Transactions</option>
            <option value="income">Income Only</option>
            <option value="expense">Expenses Only</option>
          </select>
        </div>

        <div className="filter-item">
          <label>Category</label>
          <select 
            className="filter-input"
            value={filters.categoryId} 
            onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
          >
            <option value="all">All Categories</option>
            {categories?.categories?.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="filter-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>

        <div className="filter-item" style={{ flex: '0 0 auto', minWidth: 'auto' }}>
           <label>Period</label>
           <div className="month-picker-pill" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)' }}>
             <Calendar size={14} />
             <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
           </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="tx-table-container glass-panel shadow-xl">
        <div className="tx-table-header">
          <span>Type</span>
          <span>Details</span>
          <span className="tx-cat-cell">Category</span>
          <span className="tx-date-cell">Date</span>
          <span className="tx-amount-cell" style={{ border: 'none' }}>Amount</span>
          <span style={{ textAlign: 'right' }}></span>
        </div>

        {transactions.length > 0 ? (
          <>
            {transactions.map(transaction => (
              <div key={transaction.id} className="tx-row">
                <div className="tx-type-cell">
                  <div className={`tx-type-icon ${transaction.type}`}>
                    {transaction.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                </div>
                <div className="tx-desc-cell">
                  <h4>{transaction.description}</h4>
                  {transaction.goal_name && <p className="text-accent" style={{ color: '#4f8cff' }}>Goal: {transaction.goal_name}</p>}
                </div>
                <div className="tx-cat-cell">
                  <span className="cat-pill" style={{ pointerEvents: 'none', background: 'rgba(255,255,255,0.03)' }}>
                    {transaction.category_name || 'General'}
                  </span>
                </div>
                <div className="tx-date-cell">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {new Date(transaction.transaction_date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="tx-amount-cell-wrapper">
                  <span className={`tx-amount-cell ${transaction.type}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                </div>
                <div className="tx-actions-cell">
                  <button 
                    className="tx-action-btn"
                    onClick={() => handleDeleteTransaction(transaction.id)}
                    title="Delete Transaction"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="dash-header" style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', marginTop: 0 }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Page {page} of {pagination.pages}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn ghost small"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <button 
                    className="btn ghost small"
                    disabled={page === pagination.pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state" style={{ padding: '5rem' }}>
             <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>No transactions found for this period.</p>
             <button 
              className="btn primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Transaction
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showImport && (
        <CSVImport 
          onClose={() => setShowImport(false)} 
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['analytics'] })
            setShowImport(false)
          }}
        />
      )}

      {showAddForm && (
        <TransactionForm
          categories={categories?.categories || []}
          goals={goals?.goals || []}
          debts={debts?.debts || []}
          savings={savings?.savings || []}
          onSubmit={handleAddTransaction}
          onClose={() => setShowAddForm(false)}
          loading={createMutation.isPending}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Transaction?"
        message="Are you sure you want to delete this transaction? This action will reverse all associated balance adjustments."
        confirmText="Delete"
        type="danger"
      />
    </div>
  )
}

function TransactionForm({ categories, goals, debts, savings, onSubmit, onClose, loading }) {
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    description: '',
    categoryId: '',
    goalId: '',
    debtId: '',
    savingsId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    tags: []
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      categoryId: formData.categoryId || null,
      goalId: formData.goalId || null,
      debtId: formData.debtId || null,
      savingsId: formData.savingsId || null,
      tags: formData.tags.filter(tag => tag.trim())
    }
    onSubmit(submitData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const selectedCategoryName = categories.find(c => c.id === parseInt(formData.categoryId))?.name

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-modal shadow-2xl" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="dash-header" style={{ marginBottom: '1.5rem', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="header-info">
            <h2 style={{ fontSize: '1.5rem', color: 'white' }}>New Transaction</h2>
            <p className="text-muted">Record your income or expense</p>
          </div>
          <button className="btn ghost small" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
             <div className="premium-form-group">
                <label>Type</label>
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px' }}>
                   <button 
                      type="button"
                      className={`btn small ${formData.type === 'expense' ? 'primary' : 'ghost'}`}
                      style={{ flex: 1 }}
                      onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                   >Expense</button>
                   <button 
                      type="button"
                      className={`btn small ${formData.type === 'income' ? 'primary' : 'ghost'}`}
                      style={{ flex: 1 }}
                      onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                   >Income</button>
                </div>
             </div>
             <div className="premium-form-group">
                <label>Amount (ZAR)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>R</span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="premium-input"
                    style={{ paddingLeft: '28px' }}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
             </div>
          </div>

          <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="premium-input"
              placeholder="What was this for?"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="premium-form-group">
              <label>Category</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="premium-input" required>
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="premium-form-group">
              <label>Date</label>
              <input
                type="date"
                name="transactionDate"
                value={formData.transactionDate}
                onChange={handleChange}
                className="premium-input"
                required
              />
            </div>
          </div>

          {/* Dynamic Linkage Sections */}
          <div style={{ marginBottom: '1.5rem' }}>
            {selectedCategoryName === 'Debt Repayment' && (
              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem' }}>Link to Debt</label>
                <select name="debtId" value={formData.debtId} onChange={handleChange} className="premium-input" required>
                  <option value="">Select debt...</option>
                  {debts.filter(d => parseFloat(d.balance) > 0).map(debt => (
                    <option key={debt.id} value={debt.id}>{debt.name} (R{debt.balance})</option>
                  ))}
                </select>
              </div>
            )}

            {selectedCategoryName === 'Savings Contribution' && (
              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem' }}>Link to Savings Pot</label>
                <select name="savingsId" value={formData.savingsId} onChange={handleChange} className="premium-input" required>
                  <option value="">Select pot...</option>
                  {savings.map(pot => (
                    <option key={pot.id} value={pot.id}>{pot.name}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.type === 'income' && selectedCategoryName !== 'Savings Contribution' && (
              <div className="premium-form-group">
                <label>Link to Goal? (Optional)</label>
                <select name="goalId" value={formData.goalId} onChange={handleChange} className="premium-input">
                  <option value="">No specific goal</option>
                  {goals.map(goal => (
                    <option key={goal.id} value={goal.id}>{goal.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn danger" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn primary" 
              style={{ flex: 2 }}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Add Transaction'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
