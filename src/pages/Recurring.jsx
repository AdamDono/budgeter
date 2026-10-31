import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Bell, BellOff, Calendar, CheckCircle, Play, Plus, Repeat, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { billsAPI, budgetsAPI, recurringAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Recurring() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.pathname.includes('/bills') ? 'bills' : 'bills')
  const [showAddRecurringForm, setShowAddRecurringForm] = useState(false)
  const [showAddBillForm, setShowAddBillForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, type: 'recurring' })
  const [billFilter, setBillFilter] = useState('all')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (location.pathname.includes('/bills')) {
      setActiveTab('bills')
    }
  }, [location.pathname])

  const { data: recurringData, isLoading: loadingRecurring } = useQuery({
    queryKey: ['recurring'],
    queryFn: async () => (await recurringAPI.getAll()).data,
  })

  const { data: billsData, isLoading: loadingBills } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => (await billsAPI.getAll()).data,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await budgetsAPI.getCategories()).data,
  })

  // Recurring mutations
  const deleteRecurringMutation = useMutation({
    mutationFn: recurringAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      toast.success('Recurring transaction deleted!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete')
    }
  })

  const createRecurringMutation = useMutation({
    mutationFn: recurringAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      setShowAddRecurringForm(false)
      toast.success('Recurring transaction created!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create')
    }
  })

  const executeRecurringMutation = useMutation({
    mutationFn: recurringAPI.execute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction processed!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to process')
    }
  })

  // Bills mutations
  const createBillMutation = useMutation({
    mutationFn: billsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      setShowAddBillForm(false)
      toast.success('Bill reminder created!')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create bill')
  })

  const markPaidMutation = useMutation({
    mutationFn: billsAPI.markPaid,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast.success(res.data?.message || 'Bill marked as paid & logged!')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update bill')
  })

  const deleteBillMutation = useMutation({
    mutationFn: billsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Bill reminder deleted')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete')
  })

  const confirmDelete = () => {
    if (!deleteConfirm.id) return
    if (deleteConfirm.type === 'bill') {
      deleteBillMutation.mutate(deleteConfirm.id)
    } else {
      deleteRecurringMutation.mutate(deleteConfirm.id)
    }
    setDeleteConfirm({ show: false, id: null, type: 'recurring' })
  }

  const recurring = recurringData?.recurringTransactions || []
  const bills = billsData?.bills || []
  const categories = categoriesData?.categories || []

  if (loadingRecurring && loadingBills) {
    return <LoadingSpinner text="Loading bills & recurring debit orders..." />
  }

  const filteredBills = bills.filter(b => {
    if (billFilter === 'overdue') return b.status === 'overdue' && !b.is_paid
    if (billFilter === 'due_soon') return b.status === 'due_soon' && !b.is_paid
    if (billFilter === 'paid') return b.is_paid
    if (billFilter === 'upcoming') return !b.is_paid && b.status === 'upcoming'
    return true
  })

  const billStats = {
    overdue: bills.filter(b => b.status === 'overdue' && !b.is_paid).length,
    dueSoon: bills.filter(b => b.status === 'due_soon' && !b.is_paid).length,
    upcoming: bills.filter(b => b.status === 'upcoming' && !b.is_paid).length,
    totalDue: bills.filter(b => !b.is_paid).reduce((s, b) => s + parseFloat(b.amount || 0), 0)
  }

  const frequencyLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly'
  }

  return (
    <div className="recurring-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info dashboard-header-info">
          <h1>Bills & Debit Orders</h1>
          <p className="text-muted dash-subtitle">Manage upcoming bill reminders, automatic debit orders, and recurring income</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setActiveTab('bills')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'bills' ? '#10b981' : 'transparent',
                color: activeTab === 'bills' ? '#0b0f19' : '#94a3b8'
              }}
            >
              <Bell size={15} /> Upcoming Bills ({bills.filter(b => !b.is_paid).length})
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'recurring' ? '#10b981' : 'transparent',
                color: activeTab === 'recurring' ? '#0b0f19' : '#94a3b8'
              }}
            >
              <Repeat size={15} /> Recurring & Debit Orders ({recurring.length})
            </button>
          </div>

          {activeTab === 'bills' ? (
            <button className="btn primary" onClick={() => setShowAddBillForm(true)}>
              <Plus size={16} /> Add Bill Reminder
            </button>
          ) : (
            <button className="btn primary" onClick={() => setShowAddRecurringForm(true)}>
              <Plus size={16} /> Add Recurring
            </button>
          )}
        </div>
      </header>

      {activeTab === 'bills' ? (
        <>
          <div className="summary-grid-v2" style={{ marginBottom: '1.5rem' }}>
            {billStats.overdue > 0 && (
              <div className="summary-card-v2 glass-card" style={{ cursor: 'pointer', borderColor: 'rgba(239,68,68,0.35)' }} onClick={() => setBillFilter('overdue')}>
                <div className="card-icon-v2 expense"><AlertCircle size={20} /></div>
                <div className="card-content-v2">
                  <span className="label">OVERDUE BILLS</span>
                  <h2 className="value text-danger">{billStats.overdue}</h2>
                </div>
              </div>
            )}
            <div className="summary-card-v2 glass-card" style={{ cursor: 'pointer' }} onClick={() => setBillFilter('due_soon')}>
              <div className="card-icon-v2 balance" style={{ color: '#f59e0b' }}><Bell size={20} /></div>
              <div className="card-content-v2">
                <span className="label">DUE SOON</span>
                <h2 className="value" style={{ color: '#f59e0b' }}>{billStats.dueSoon}</h2>
              </div>
            </div>
            <div className="summary-card-v2 glass-card" style={{ cursor: 'pointer' }} onClick={() => setBillFilter('upcoming')}>
              <div className="card-icon-v2 income"><Calendar size={20} /></div>
              <div className="card-content-v2">
                <span className="label">UPCOMING</span>
                <h2 className="value">{billStats.upcoming}</h2>
              </div>
            </div>
            <div className="summary-card-v2 glass-card" onClick={() => setBillFilter('all')} style={{ cursor: 'pointer' }}>
              <div className="card-icon-v2 savings"><BellOff size={20} /></div>
              <div className="card-content-v2">
                <span className="label">TOTAL UNPAID</span>
                <h2 className="value">{formatCurrency(billStats.totalDue)}</h2>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {['all', 'overdue', 'due_soon', 'upcoming', 'paid'].map(f => (
              <button
                key={f}
                onClick={() => setBillFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: billFilter === f ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                  background: billFilter === f ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                  color: billFilter === f ? '#10b981' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {f === 'due_soon' ? 'Due Soon' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="recurring-grid-v2">
            {filteredBills.length > 0 ? (
              filteredBills.map(bill => {
                const statusColor = bill.is_paid
                  ? '#10b981'
                  : bill.status === 'overdue'
                    ? '#ef4444'
                    : bill.status === 'due_soon'
                      ? '#f59e0b'
                      : '#3b82f6'
                const statusLabel = bill.is_paid
                  ? 'Paid ✓'
                  : bill.status === 'overdue'
                    ? `${Math.abs(bill.days_until_due)} days overdue`
                    : bill.days_until_due === 0
                      ? 'Due today!'
                      : `Due in ${bill.days_until_due} days`

                return (
                  <div key={bill.id} className="recurring-glass-card shadow-2xl" style={{ borderLeft: `4px solid ${statusColor}` }}>
                    <div className="recurring-card-header">
                      <div className="recurring-card-title">
                        <h3>{bill.name}</h3>
                        <p className="recurring-card-category">{bill.category_name || 'Bill Reminder'}</p>
                      </div>
                      <div className="recurring-card-actions">
                        <button
                          className="text-danger"
                          onClick={() => setDeleteConfirm({ show: true, id: bill.id, type: 'bill' })}
                          title="Delete Bill"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="recurring-amount-block">
                      <span className="recurring-value">{formatCurrency(bill.amount || 0)}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="recurring-freq-bar">
                      <Calendar size={14} />
                      <span>
                        Due: {new Date(bill.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {bill.frequency ? ` • ${frequencyLabels[bill.frequency] || bill.frequency}` : ' • One-off'}
                      </span>
                    </div>

                    {!bill.is_paid && (
                      <div style={{ marginTop: '1rem' }}>
                        <button
                          className="btn primary small"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => markPaidMutation.mutate(bill.id)}
                          disabled={markPaidMutation.isPending}
                        >
                          <CheckCircle size={14} /> Mark Paid & Log Expense
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="empty-state glass-panel" style={{ gridColumn: '1 / -1', padding: '4rem 2rem' }}>
                <Bell size={48} />
                <h3>No Bill Reminders Found</h3>
                <p className="text-muted">Add your rent, municipal bills, insurance, or subscriptions so you never miss a due date—and let the AI Statement Scanner auto-mark them paid when you upload your bank statement.</p>
                <button
                  className="btn primary"
                  style={{ marginTop: '1.5rem' }}
                  onClick={() => setShowAddBillForm(true)}
                >
                  <Plus size={16} /> Add Your First Bill Reminder
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
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
                      onClick={() => executeRecurringMutation.mutate(item.id)}
                      title="Process Today"
                    >
                      <Play size={14} />
                    </button>
                    <button 
                      className="text-danger"
                      onClick={() => setDeleteConfirm({ show: true, id: item.id, type: 'recurring' })}
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
              <p className="text-muted">Set up automatic recurring income like salary or fixed debit orders</p>
              <button 
                className="btn primary"
                style={{ marginTop: '1.5rem' }}
                onClick={() => setShowAddRecurringForm(true)}
              >
                Create Your First Recurring Transaction
              </button>
            </div>
          )}
        </div>
      )}

      {showAddRecurringForm && (
        <RecurringForm
          onSubmit={(data) => createRecurringMutation.mutate(data)}
          onClose={() => setShowAddRecurringForm(false)}
          loading={createRecurringMutation.isPending}
          categories={categories}
        />
      )}

      {showAddBillForm && (
        <BillForm
          categories={categories}
          onSubmit={(data) => createBillMutation.mutate(data)}
          onClose={() => setShowAddBillForm(false)}
          loading={createBillMutation.isPending}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null, type: 'recurring' })}
        onConfirm={confirmDelete}
        title={deleteConfirm.type === 'bill' ? 'Delete Bill Reminder?' : 'Stop Recurring?'}
        message={
          deleteConfirm.type === 'bill'
            ? 'Are you sure you want to delete this bill reminder?'
            : 'Are you sure you want to stop this recurring transaction? New transactions will no longer be created automatically.'
        }
        confirmText="Delete"
        type="danger"
      />
    </div>
  )
}

function BillForm({ categories, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({
    name: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    frequency: 'monthly',
    category_id: '',
    reminder_days: 3
  })

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      amount: form.amount ? parseFloat(form.amount) : null,
      category_id: form.category_id || null,
      frequency: form.frequency || null,
      reminder_days: parseInt(form.reminder_days || 3, 10)
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-modal shadow-2xl" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header-v2">
          <div className="header-info">
            <h2 style={{ fontSize: '1.5rem', color: 'white' }}>Add Bill Reminder</h2>
            <p className="text-muted">Track due dates & auto-match with bank statement uploads</p>
          </div>
          <button className="btn ghost small" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
          <div className="premium-form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Bill / Payee Name</label>
            <input
              name="name"
              className="premium-input"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g., Rent, Vodacom, Discovery, City Power"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="premium-form-group">
              <label>Amount (ZAR)</label>
              <input
                name="amount"
                type="number"
                className="premium-input"
                value={form.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
            <div className="premium-form-group">
              <label>Next Due Date</label>
              <input
                name="due_date"
                type="date"
                className="premium-input"
                value={form.due_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="premium-form-group">
              <label>Frequency</label>
              <select name="frequency" className="premium-input" value={form.frequency} onChange={handleChange}>
                <option value="">One-time</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="premium-form-group">
              <label>Remind Me (Days Before)</label>
              <input
                name="reminder_days"
                type="number"
                className="premium-input"
                value={form.reminder_days}
                onChange={handleChange}
                min="0"
                max="30"
              />
            </div>
          </div>

          <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Category (Optional)</label>
            <select name="category_id" className="premium-input" value={form.category_id} onChange={handleChange}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Creating...' : 'Add Bill Reminder'}
            </button>
          </div>
        </form>
      </div>
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
