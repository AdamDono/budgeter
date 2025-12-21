import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, DollarSign, Play, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import { budgetsAPI, recurringAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Recurring() {
  const [showAddForm, setShowAddForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: recurringData, isLoading } = useQuery({
    queryKey: ['recurring'],
    queryFn: async () => (await recurringAPI.getAll()).data,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await budgetsAPI.getCategories()).data,
  })

  const deleteMutation = useMutation({
    mutationFn: recurringAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      toast.success('Recurring transaction deleted!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete')
    }
  })

  const createMutation = useMutation({
    mutationFn: recurringAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      setShowAddForm(false)
      toast.success('Recurring transaction created!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create')
    }
  })

  const executeMutation = useMutation({
    mutationFn: recurringAPI.execute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast.success('Transaction processed!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to process')
    }
  })

  const handleDelete = (id) => {
    if (confirm('Delete this recurring transaction?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCreate = (formData) => {
    createMutation.mutate(formData)
  }

  const handleExecute = (id) => {
    executeMutation.mutate(id)
  }

  const recurring = recurringData?.recurringTransactions || []
  const categories = categoriesData?.categories || []

  if (isLoading) {
    return <LoadingSpinner text="Loading recurring transactions..." />
  }

  const frequencyLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly'
  }

  return (
    <div className="recurring-page">
      <div className="page-header">
        <div>
          <h1>Recurring Transactions</h1>
          <p>Set up automatic income and expenses like salary, rent, subscriptions</p>
        </div>
        <button 
          className="btn primary"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={16} />
          Add Recurring
        </button>
      </div>

      <div className="recurring-grid">
        {recurring.length > 0 ? (
          recurring.map(item => (
            <div key={item.id} className="recurring-card">
              <div className="recurring-header">
                <div className="recurring-title">
                  <h3>{item.description}</h3>
                  <p className="recurring-category">{item.category_name || 'Uncategorized'}</p>
                </div>
                <div className="recurring-actions">
                  <button 
                    className="btn ghost small"
                    onClick={() => handleExecute(item.id)}
                    title="Process Today"
                  >
                    <Play size={14} />
                  </button>
                  <button 
                    className="btn ghost small"
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="recurring-details">
                <div className="detail-item">
                  <DollarSign size={16} />
                  <span>{formatCurrency(item.amount)}</span>
                </div>
                <div className="detail-item">
                  <Calendar size={16} />
                  <span>{frequencyLabels[item.frequency]}</span>
                </div>
                <div className={`detail-item type ${item.type}`}>
                  <span>{item.type === 'income' ? '+' : '-'} {item.type}</span>
                </div>
              </div>

              <div className="recurring-meta">
                <span className="next-due">
                  Next: {new Date(item.next_due_date).toLocaleDateString()}
                </span>
                {item.auto_create && (
                  <span className="auto-create-badge">Auto</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Calendar size={48} />
            <h3>No Recurring Transactions</h3>
            <p>Set up recurring income like salary or expenses like rent</p>
            <button 
              className="btn primary"
              onClick={() => setShowAddForm(true)}
            >
              Create Your First Recurring Transaction
            </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <RecurringForm
          onSubmit={handleCreate}
          onClose={() => setShowAddForm(false)}
          loading={createMutation.isPending}
          categories={categories}
        />
      )}
    </div>
  )
}

function RecurringForm({ onSubmit, onClose, loading, categories }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    categoryId: '',
    accountId: 1,
    autoCreate: true
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
      accountId: parseInt(formData.accountId),
      autoCreate: formData.autoCreate
    })
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Recurring Transaction</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="recurring-form">
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Monthly Salary, Rent, Netflix"
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
              <label>Type</label>
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Frequency</label>
              <select name="frequency" value={formData.frequency} onChange={handleChange}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange}>
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date (Optional)</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="autoCreate"
                checked={formData.autoCreate}
                onChange={handleChange}
              />
              <span>Auto-create transactions (don't ask me each time)</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Recurring'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
