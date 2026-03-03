import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Bell, BellOff, Calendar, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { billsAPI, budgetsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Bills() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })
  const [filter, setFilter] = useState('all') // all | upcoming | overdue | paid
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => (await billsAPI.getAll()).data,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await budgetsAPI.getCategories()).data,
  })

  const createMutation = useMutation({
    mutationFn: billsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      setShowAddForm(false)
      toast.success('Bill reminder created!')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create bill')
  })

  const markPaidMutation = useMutation({
    mutationFn: billsAPI.markPaid,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      toast.success(res.data.message || 'Bill marked as paid!')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update bill')
  })

  const deleteMutation = useMutation({
    mutationFn: billsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Bill deleted')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete')
  })

  const bills = data?.bills || []

  const filtered = bills.filter(b => {
    if (filter === 'overdue') return b.status === 'overdue'
    if (filter === 'due_soon') return b.status === 'due_soon'
    if (filter === 'paid') return b.is_paid
    if (filter === 'upcoming') return !b.is_paid && b.status === 'upcoming'
    return true
  })

  const stats = {
    overdue: bills.filter(b => b.status === 'overdue' && !b.is_paid).length,
    dueSoon: bills.filter(b => b.status === 'due_soon' && !b.is_paid).length,
    upcoming: bills.filter(b => b.status === 'upcoming' && !b.is_paid).length,
    totalDue: bills.filter(b => !b.is_paid).reduce((s, b) => s + parseFloat(b.amount || 0), 0)
  }

  if (isLoading) return <LoadingSpinner text="Loading bills..." />

  return (
    <div className="bills-page">
      <div className="page-header">
        <div>
          <h1>Bill Reminders</h1>
          <p>Track upcoming payments and never miss a due date</p>
        </div>
        <button className="btn primary" onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> Add Bill
        </button>
      </div>

      {/* Stats row */}
      <div className="bills-stats">
        {stats.overdue > 0 && (
          <div className="bill-stat-card overdue" onClick={() => setFilter('overdue')}>
            <AlertCircle size={20} />
            <div>
              <span className="stat-num">{stats.overdue}</span>
              <span className="stat-label">Overdue</span>
            </div>
          </div>
        )}
        <div className="bill-stat-card due-soon" onClick={() => setFilter('due_soon')}>
          <Bell size={20} />
          <div>
            <span className="stat-num">{stats.dueSoon}</span>
            <span className="stat-label">Due Soon</span>
          </div>
        </div>
        <div className="bill-stat-card upcoming" onClick={() => setFilter('upcoming')}>
          <Calendar size={20} />
          <div>
            <span className="stat-num">{stats.upcoming}</span>
            <span className="stat-label">Upcoming</span>
          </div>
        </div>
        <div className="bill-stat-card total">
          <BellOff size={20} />
          <div>
            <span className="stat-num">{formatCurrency(stats.totalDue)}</span>
            <span className="stat-label">Total Due</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bills-tabs">
        {['all', 'overdue', 'due_soon', 'upcoming', 'paid'].map(f => (
          <button
            key={f}
            className={`tab-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'due_soon' ? 'Due Soon' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Bills list */}
      <div className="bills-list">
        {filtered.length === 0 ? (
          <div className="empty-state-improved">
            <div className="empty-icon">🔔</div>
            <h3>No bills here</h3>
            <p>Add your recurring payments and due dates to stay on top of them.</p>
            <button className="btn primary" onClick={() => setShowAddForm(true)}>
              Add Your First Bill
            </button>
          </div>
        ) : (
          filtered.map(bill => (
            <BillCard
              key={bill.id}
              bill={bill}
              onPay={() => markPaidMutation.mutate(bill.id)}
              onDelete={() => setDeleteConfirm({ show: true, id: bill.id })}
              payLoading={markPaidMutation.isPending}
            />
          ))
        )}
      </div>

      {showAddForm && (
        <BillForm
          categories={categories?.categories || []}
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowAddForm(false)}
          loading={createMutation.isPending}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={() => {
          deleteMutation.mutate(deleteConfirm.id)
          setDeleteConfirm({ show: false, id: null })
        }}
        title="Delete Bill Reminder"
        message="Are you sure you want to delete this bill reminder?"
        confirmText="Delete"
        type="danger"
      />
    </div>
  )
}

function BillCard({ bill, onPay, onDelete, payLoading }) {
  const statusColors = {
    overdue: 'var(--danger)',
    due_soon: 'var(--warning)',
    upcoming: 'var(--accent)',
  }

  const statusLabels = {
    overdue: `${Math.abs(bill.days_until_due)} days overdue`,
    due_soon: bill.days_until_due === 0 ? 'Due today!' : `Due in ${bill.days_until_due} days`,
    upcoming: `Due in ${bill.days_until_due} days`,
  }

  const color = bill.is_paid ? 'var(--pos)' : (statusColors[bill.status] || 'var(--accent)')
  const label = bill.is_paid ? 'Paid ✓' : (statusLabels[bill.status] || '')

  return (
    <div className={`bill-card ${bill.status} ${bill.is_paid ? 'paid' : ''}`}>
      <div className="bill-left">
        <div className="bill-icon" style={{ background: `${color}22`, color }}>
          {bill.is_paid ? <CheckCircle size={20} /> : <Bell size={20} />}
        </div>
        <div className="bill-info">
          <h3>{bill.name}</h3>
          <div className="bill-meta">
            {bill.category_name && <span className="bill-category">{bill.category_name}</span>}
            {bill.frequency && <span className="bill-frequency">{bill.frequency}</span>}
            <span className="bill-date">
              {new Date(bill.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <span className="bill-status-badge" style={{ color }}>{label}</span>
        </div>
      </div>
      <div className="bill-right">
        {bill.amount && <div className="bill-amount">{formatCurrency(bill.amount)}</div>}
        <div className="bill-actions">
          {!bill.is_paid && (
            <button className="btn primary small" onClick={onPay} disabled={payLoading}>
              {payLoading ? '...' : 'Mark Paid'}
            </button>
          )}
          <button className="btn ghost small" onClick={onDelete}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function BillForm({ categories, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({
    name: '', amount: '', due_date: '', frequency: '', category_id: '', reminder_days: 3
  })

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      amount: form.amount ? parseFloat(form.amount) : null,
      category_id: form.category_id || null,
      frequency: form.frequency || null,
      reminder_days: parseInt(form.reminder_days)
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Bill Reminder</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="bill-form">
          <div className="form-group">
            <label>Bill Name</label>
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="e.g. Rent, Netflix, Gym" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Amount (ZAR)</label>
              <div className="amount-input-wrapper">
                <span className="currency-prefix">R</span>
                <input name="amount" type="number" value={form.amount} onChange={handleChange}
                  step="0.01" min="0" placeholder="0.00" className="amount-input" />
              </div>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input name="due_date" type="date" value={form.due_date} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Frequency (optional)</label>
              <select name="frequency" value={form.frequency} onChange={handleChange}>
                <option value="">One-time</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="form-group">
              <label>Remind me (days before)</label>
              <input name="reminder_days" type="number" value={form.reminder_days}
                onChange={handleChange} min="0" max="30" />
            </div>
          </div>

          <div className="form-group">
            <label>Category (optional)</label>
            <select name="category_id" value={form.category_id} onChange={handleChange}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Creating...' : 'Add Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
