import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, Trash2, TrendingUp, Target, X } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { goalsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Goals() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showContributeModal, setShowContributeModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })
  
  const queryClient = useQueryClient()

  const { data: goalsData, isLoading, error: goalsError } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => (await goalsAPI.getAll()).data,
  })

  const createMutation = useMutation({
    mutationFn: goalsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      setShowAddForm(false)
      toast.success('Goal established successfully!')
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to create goal')
  })

  const deleteMutation = useMutation({
    mutationFn: goalsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal removed.')
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to delete goal')
  })

  const contributeMutation = useMutation({
    mutationFn: ({ goalId, data }) => goalsAPI.contribute(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setShowContributeModal(null)
      toast.success('Contribution processed.')
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to add contribution')
  })

  const handleCreateGoal = (formData) => createMutation.mutate(formData)
  const handleDeleteGoal = (id) => setDeleteConfirm({ show: true, id })
  const confirmDelete = () => deleteConfirm.id && deleteMutation.mutate(deleteConfirm.id)
  const handleContribute = (goalId, data) => contributeMutation.mutate({ goalId, data })

  const goals = goalsData?.goals || []

  if (isLoading) return <LoadingSpinner text="Synchronizing goals..." />

  return (
    <div className="goals-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info">
          <h1>Financial Goals</h1>
          <p className="text-muted">Track your savings and long-term targets</p>
        </div>
        <button className="btn primary" onClick={() => setShowAddForm(true)}>
          <Plus size={18} /> New Goal
        </button>
      </header>

      <div className="goals-glass-grid">
        {goals.length > 0 ? (
          goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDelete={handleDeleteGoal}
              onContribute={() => setShowContributeModal(goal)}
            />
          ))
        ) : (
          <div className="empty-state glass-panel" style={{ gridColumn: '1 / -1', padding: '5rem' }}>
            <div style={{ background: 'rgba(79, 140, 255, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
              <Target size={40} className="text-accent" />
            </div>
            <h3>No Goals Set Yet</h3>
            <p className="text-muted" style={{ maxWidth: '400px', margin: '0 auto 2rem' }}>Define your first financial objective and start building towards it with precision.</p>
            <button className="btn primary" onClick={() => setShowAddForm(true)}>
              Initialize First Goal
            </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <GoalForm
          onSubmit={handleCreateGoal}
          onClose={() => setShowAddForm(false)}
          loading={createMutation.isPending}
        />
      )}

      {showContributeModal && (
        <ContributeModal
          goal={showContributeModal}
          onSubmit={(data) => handleContribute(showContributeModal.id, data)}
          onClose={() => setShowContributeModal(null)}
          loading={contributeMutation.isPending}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Goal?"
        message="Are you sure you want to remove this goal? History will be preserved but the target tracking will end."
        confirmText="Delete"
        type="danger"
      />
    </div>
  )
}

function GoalCard({ goal, onDelete, onContribute }) {
  const progressPercentage = Math.min(100, goal.progress_percentage || 0)
  const isAchieved = goal.is_achieved || progressPercentage >= 100
  const remaining = goal.target_amount - goal.current_amount
  
  const daysRemaining = goal.target_date 
    ? Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className={`goal-glass-card ${isAchieved ? 'achieved' : ''}`}>
      <div className="goal-card-header">
        <div>
          <h3>{goal.name}</h3>
          <p>{goal.description || 'General Target'}</p>
        </div>
        <button className="tx-action-btn" onClick={() => onDelete(goal.id)}>
          <Trash2 size={16} />
        </button>
      </div>

      <div className="goal-progress-section">
        <div className="goal-progress-labels">
          <div className="goal-progress-current">
            <span className="goal-current-val">{formatCurrency(goal.current_amount)}</span>
            <span className="goal-target-val">Target: {formatCurrency(goal.target_amount)}</span>
          </div>
          {isAchieved ? (
            <div className="achievement-status">🎉 Goal Achieved!</div>
          ) : (
            <div className="goal-percentage-pill">{progressPercentage.toFixed(1)}%</div>
          )}
        </div>
        
        <div className="premium-progress-container">
          <div 
            className={`premium-progress-fill ${isAchieved ? 'achieved' : ''}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="goal-intel-grid">
        {goal.target_date && (
          <div className="intel-block">
            <div className="intel-icon"><Calendar size={16} /></div>
            <div className="intel-content">
              <span className="intel-label">Timeline</span>
              <span className="intel-value">
                {daysRemaining > 0 
                  ? `${daysRemaining} Days Left`
                  : daysRemaining === 0 ? 'Due Today'
                  : `${Math.abs(daysRemaining)} Overdue`
                }
              </span>
            </div>
          </div>
        )}
        
        {!isAchieved && (
          <div className="intel-block">
            <div className="intel-icon"><TrendingUp size={16} /></div>
            <div className="intel-content">
              <span className="intel-label">To Go</span>
              <span className="intel-value">{formatCurrency(remaining)}</span>
            </div>
          </div>
        )}
      </div>

      {!isAchieved && (
        <button 
          className="btn primary" 
          style={{ width: 'fit-content', alignSelf: 'center', marginTop: 'auto' }} 
          onClick={onContribute}
        >
          Increase Contribution
        </button>
      )}
    </div>
  )
}

function GoalForm({ onSubmit, onClose, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: '',
    priority: 2
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      targetDate: formData.targetDate || null
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-modal shadow-2xl" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="dash-header" style={{ marginBottom: '1.5rem', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="header-info">
            <h2 style={{ fontSize: '1.5rem', color: 'white' }}>New Goal</h2>
            <p className="text-muted">Define a new financial objective</p>
          </div>
          <button className="btn ghost small" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
          <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Title</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="premium-input"
              placeholder="e.g. Dream Car, Home Deposit"
              required
            />
          </div>

          <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              className="premium-input"
              placeholder="Context for this target..."
              rows="2"
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="premium-form-group">
              <label>Target (ZAR)</label>
              <input
                type="number"
                name="targetAmount"
                value={formData.targetAmount}
                onChange={(e) => setFormData(p => ({ ...p, targetAmount: e.target.value }))}
                className="premium-input"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
            <div className="premium-form-group">
              <label>Deadline</label>
              <input
                type="date"
                name="targetDate"
                value={formData.targetDate}
                onChange={(e) => setFormData(p => ({ ...p, targetDate: e.target.value }))}
                className="premium-input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn danger" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Creating...' : 'Initialize Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ContributeModal({ goal, onSubmit, onClose, loading }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState(`Contribution to ${goal.name}`)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ amount: parseFloat(amount), description, accountId: 1 })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-modal shadow-2xl small" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
         <div className="dash-header" style={{ marginBottom: '1.5rem', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="header-info">
            <h2 style={{ fontSize: '1.3rem', color: 'white' }}>Increase Stake</h2>
            <p className="text-muted">{goal.name}</p>
          </div>
          <button className="btn ghost small" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
          <div className="intel-block" style={{ marginBottom: '1.5rem', justifyContent: 'space-between' }}>
            <span className="text-muted">Current Progress</span>
            <span className="text-accent">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
          </div>

          <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Amount (ZAR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="premium-input"
              step="0.01"
              max={goal.target_amount - goal.current_amount}
              placeholder="0.00"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn danger" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
