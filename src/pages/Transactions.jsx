import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { budgetsAPI, debtsAPI, goalsAPI, savingsAPI, transactionsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Transactions() {
  const [showAddForm, setShowAddForm] = useState(false)
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
      const response = await transactionsAPI.getAll({ ...filters, page, limit: 20 })
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
    return <LoadingSpinner text="Loading transactions..." />
  }

  if (txError) {
    return (
      <div className="transactions-page">
        <div style={{ color: 'red', padding: '20px' }}>
          <h2>Error Loading Transactions</h2>
          <p>{txError.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="transactions-page">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>Manage your income and expenses</p>
        </div>
        <div className="header-actions">
          <div className="month-selector">
            <Calendar size={18} />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="month-input"
            />
          </div>
          <button 
            className="btn primary"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Type</label>
            <select 
              value={filters.type} 
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select 
              value={filters.categoryId} 
              onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
            >
              <option value="all">All Categories</option>
              {categories?.categories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Search</label>
            <div className="search-input">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="transactions-list">
        {transactions.length > 0 ? (
          <>
            {transactions.map(transaction => (
              <div key={transaction.id} className="transaction-card">
                <div className="transaction-main">
                  <div className="transaction-type">
                    <span className={`type-badge ${transaction.type}`}>
                      {transaction.type}
                    </span>
                  </div>
                  <div className="transaction-details">
                    <h3>{transaction.description}</h3>
                    <div className="transaction-meta">
                      <span className="category">
                        {transaction.category_name || 'Uncategorized'}
                      </span>
                      <span className="date">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </span>
                      {transaction.goal_name && (
                        <span className="goal">Goal: {transaction.goal_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="transaction-actions">
                  <div className={`transaction-amount ${transaction.type}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </div>
                  <div className="action-buttons">
                    <button 
                      className="btn ghost small"
                      onClick={() => handleDeleteTransaction(transaction.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination">
                <button 
                  className="btn ghost"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {page} of {pagination.pages}
                </span>
                <button 
                  className="btn ghost"
                  disabled={page === pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>No transactions found</p>
            <button 
              className="btn primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Your First Transaction
            </button>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This will revert any balance updates associated with it."
        confirmText="Delete"
        type="danger"
      />
    </div>
  )
}

// Transaction Form Component
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

  // Auto-select category for special types
  useEffect(() => {
    if (formData.categoryId) {
      const selectedCat = categories.find(c => c.id === parseInt(formData.categoryId))
      if (selectedCat) {
        if (selectedCat.name === 'Debt Repayment') {
          // Keep as is or trigger something
        }
      }
    }
  }, [formData.categoryId, categories])

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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const selectedCategoryName = categories.find(c => c.id === parseInt(formData.categoryId))?.name

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Add Transaction</h2>
            <p className="section-subtitle">Record your financial movement</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-row">
            <div className="form-group">
              <label>Transaction Type</label>
              <div className="type-toggle">
                <button 
                  type="button" 
                  className={`toggle-btn ${formData.type === 'expense' ? 'active expense' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                >
                  Expense
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn ${formData.type === 'income' ? 'active income' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                >
                  Income
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Amount (ZAR)</label>
              <div className="amount-input-wrapper">
                <span className="currency-prefix">R</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                  className="amount-input"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>What was this for?</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g. Woolworths Groceries, Rent, Salary"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="transactionDate"
                value={formData.transactionDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Dynamic Sections Based on Selection */}
          <div className="dynamic-sections">
            {selectedCategoryName === 'Debt Repayment' && (
              <div className="special-link-section debt animated fadeIn">
                <label>Select Debt to Pay Off</label>
                <select name="debtId" value={formData.debtId} onChange={handleChange} required>
                  <option value="">Choose debt...</option>
                  {debts.filter(d => parseFloat(d.balance) > 0).map(debt => (
                    <option key={debt.id} value={debt.id}>{debt.name} (Bal: R{debt.balance})</option>
                  ))}
                </select>
                <p className="help-text">Linking to a debt will automatically reduce its balance.</p>
              </div>
            )}

            {selectedCategoryName === 'Savings Contribution' && (
              <div className="special-link-section savings animated fadeIn">
                <label>Select Savings Pot</label>
                <select name="savingsId" value={formData.savingsId} onChange={handleChange} required>
                  <option value="">Choose pot...</option>
                  {savings.map(pot => (
                    <option key={pot.id} value={pot.id}>{pot.name} (Goal: R{pot.target_amount})</option>
                  ))}
                </select>
                <p className="help-text">This will add funds to your savings goal.</p>
              </div>
            )}

            {formData.type === 'income' && selectedCategoryName !== 'Savings Contribution' && (
              <div className="special-link-section goal animated fadeIn">
                <label>Add to Goal? (Optional)</label>
                <select name="goalId" value={formData.goalId} onChange={handleChange}>
                  <option value="">No goal</option>
                  {goals.map(goal => (
                    <option key={goal.id} value={goal.id}>{goal.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Processing...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
