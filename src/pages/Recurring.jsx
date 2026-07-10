import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, DollarSign, Play, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { budgetsAPI, recurringAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Recurring() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })
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
    setDeleteConfirm({ show: true, id })
  }

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      deleteMutation.mutate(deleteConfirm.id)
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
    <div className="recurring-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info dashboard-header-info">
          <h1>Recurring Transactions</h1>
          <p className="text-muted dash-subtitle">Set up automatic income and expenses like salary, rent, subscriptions</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn primary"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} /> Add Recurring
          </button>
        </div>
      </header>

      <div className="recurring-grid-v2">
        {recurring.length > 0 ? (
          recurring.map(item => (
            <div key={item.id} className="recurring-glass-card shadow-2xl">
              <div className="recurring-card-header">
                <div className="recurring-card-title">
                  <h3>{item.description}</h3>
                  <p className="recurring-card-category">{item.category_name || 'Uncategorized'}</p>
                </div>
                <div className="recurring-card-actions">
                  <button 
                    onClick={() => handleExecute(item.id)}
                    title="Process Today"
                  >
                    <Play size={14} />
                  </button>
                  <button 
                    className="text-danger"
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="recurring-amount-block">
                <span className="recurring-value">{formatCurrency(item.amount)}</span>
                <span className={`recurring-type ${item.type}`}>
                  {item.type === 'income' ? '+ Income' : '- Expense'}
                </span>
              </div>

              <div className="recurring-freq-bar">
                <Calendar size={14} />
                <span>{frequencyLabels[item.frequency]}</span>
              </div>

              <div className="recurring-meta-row">
                <span className="recurring-next-due">
                  Next: {new Date(item.next_due_date).toLocaleDateString('en-ZA')}
                </span>
                {item.auto_create && (
                  <span className="recurring-auto-badge">Auto</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state glass-panel" style={{ gridColumn: '1 / -1', padding: '4rem 2rem' }}>
            <Calendar size={48} />
            <h3>No Recurring Transactions</h3>
            <p className="text-muted">Set up recurring income like salary or expenses like rent</p>
            <button 
              className="btn primary"
              style={{ marginTop: '1.5rem' }}
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

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Stop Recurring?"
        message="Are you sure you want to stop this recurring transaction? New transactions will no longer be created automatically."
        confirmText="Stop"
        type="danger"
      />
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
    autoCreate: true
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
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
      <div className="modal-content glass-modal shadow-2xl" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-v2">
          <div className="header-info">
            <h2 style={{ fontSize: '1.5rem', color: 'white' }}>Add Recurring Transaction</h2>
            <p className="text-muted">Set up automatic income or expenses</p>
          </div>
          <button className="btn ghost small" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
          <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Description</label>
            <input
              type="text"
              name="description"
              className="premium-input"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Monthly Salary, Rent, Netflix"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
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
              <label>Type</label>
              <select name="type" className="premium-input" value={formData.type} onChange={handleChange}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="premium-form-group">
              <label>Frequency</label>
              <select name="frequency" className="premium-input" value={formData.frequency} onChange={handleChange}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="premium-form-group">
              <label>Category</label>
              <select name="categoryId" className="premium-input" value={formData.categoryId} onChange={handleChange}>
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="premium-form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                className="premium-input"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="premium-form-group">
              <label>End Date (Optional)</label>
              <input
                type="date"
                name="endDate"
                className="premium-input"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="premium-form-group checkbox" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="autoCreate"
                checked={formData.autoCreate}
                onChange={handleChange}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Auto-create transactions (don't ask me each time)</span>
            </label>
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
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
