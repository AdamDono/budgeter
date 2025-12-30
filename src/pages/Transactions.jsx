import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
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
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteMutation.mutate(id)
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
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Transaction</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select name="type" value={formData.type} onChange={handleChange} required>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

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
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What was this transaction for?"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange}>
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Goal (Optional)</label>
              <select name="goalId" value={formData.goalId} onChange={handleChange}>
                <option value="">No goal</option>
                {goals.map(goal => (
                  <option key={goal.id} value={goal.id}>{goal.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Link to Debt (Optional)</label>
              <select name="debtId" value={formData.debtId} onChange={handleChange}>
                <option value="">No debt</option>
                {debts.map(debt => (
                  <option key={debt.id} value={debt.id}>{debt.name} (R{debt.balance})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Link to Savings (Optional)</label>
              <select name="savingsId" value={formData.savingsId} onChange={handleChange}>
                <option value="">No savings pot</option>
                {savings.map(pot => (
                  <option key={pot.id} value={pot.id}>{pot.name}</option>
                ))}
              </select>
            </div>
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

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
