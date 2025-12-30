import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, Trash2, TrendingUp } from 'lucide-react'
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

  // Queries
  const { data: goalsData, isLoading, error: goalsError } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      try {
        const response = await goalsAPI.getAll()
        console.log('✅ Goals API Response:', response)
        console.log('✅ Goals Data:', response.data)
        return response.data
      } catch (err) {
        console.error('❌ Goals API Error:', err)
        throw err
      }
    },
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: goalsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      setShowAddForm(false)
      toast.success('Goal created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create goal')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: goalsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete goal')
    }
  })

  const contributeMutation = useMutation({
    mutationFn: ({ goalId, data }) => goalsAPI.contribute(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setShowContributeModal(null)
      toast.success('Contribution added successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add contribution')
    }
  })

  const handleCreateGoal = (formData) => {
    createMutation.mutate(formData)
  }

  const handleDeleteGoal = (id) => {
    setDeleteConfirm({ show: true, id })
  }

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      deleteMutation.mutate(deleteConfirm.id)
    }
  }

  const handleContribute = (goalId, data) => {
    contributeMutation.mutate({ goalId, data })
  }

  const goals = goalsData?.goals || []

  if (isLoading) {
    return <LoadingSpinner text="Loading goals..." />
  }

  if (goalsError) {
    console.error('Goals Error:', goalsError)
    return (
      <div className="goals-page">
        <div style={{ color: 'red', padding: '20px' }}>
          <h2>Error Loading Goals</h2>
          <p>{goalsError.message}</p>
          <pre>{JSON.stringify(goalsError, null, 2)}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="goals-page">
      <div className="page-header">
        <div>
          <h1>Financial Goals</h1>
          <p>Track your savings and financial milestones</p>
        </div>
        <button 
          className="btn primary"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={16} />
          Add Goal
        </button>
      </div>

      {/* Goals Grid */}
      <div className="goals-grid">
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
          <div className="empty-state-improved">
            <div className="empty-icon">🎯</div>
            <h3>No Goals Set Yet</h3>
            <p>Set your first financial goal and start saving with purpose!</p>
            <div className="empty-tips">
              <p><strong>💡 Suggested Goals:</strong></p>
              <ul>
                <li>Emergency Fund (3-6 months expenses)</li>
                <li>Vacation or Travel Fund</li>
                <li>Down Payment for Home/Car</li>
                <li>Retirement Savings</li>
              </ul>
            </div>
            <button 
              className="btn primary"
              onClick={() => setShowAddForm(true)}
            >
              Create Your First Goal
            </button>
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddForm && (
        <GoalForm
          onSubmit={handleCreateGoal}
          onClose={() => setShowAddForm(false)}
          loading={createMutation.isPending}
        />
      )}

      {/* Contribute Modal */}
      {showContributeModal && (
        <ContributeModal
          goal={showContributeModal}
          onSubmit={(data) => handleContribute(showContributeModal.id, data)}
          onClose={() => setShowContributeModal(null)}
          loading={contributeMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Goal"
        message="Are you sure you want to delete this goal? All transaction history linked to this goal will be preserved but unlinked."
        confirmText="Delete"
        type="danger"
      />
    </div>
  )
}

// Goal Card Component
function GoalCard({ goal, onDelete, onContribute }) {
  const progressPercentage = Math.min(100, goal.progress_percentage || 0)
  const isAchieved = goal.is_achieved || progressPercentage >= 100
  const remaining = goal.target_amount - goal.current_amount
  
  const daysRemaining = goal.target_date 
    ? Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className={`goal-card ${isAchieved ? 'achieved' : ''}`}>
      <div className="goal-header">
        <div className="goal-title">
          <h3>{goal.name}</h3>
          {goal.description && <p className="goal-description">{goal.description}</p>}
        </div>
        <div className="goal-actions">
          <button 
            className="btn ghost small"
            onClick={() => onDelete(goal.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="goal-progress">
        <div className="progress-info">
          <span className="current-amount">{formatCurrency(goal.current_amount)}</span>
          <span className="target-amount">of {formatCurrency(goal.target_amount)}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="progress-percentage">
          {progressPercentage.toFixed(1)}% Complete
        </div>
      </div>

      <div className="goal-details">
        {goal.target_date && (
          <div className="goal-detail">
            <Calendar size={16} />
            <span>
              {daysRemaining > 0 
                ? `${daysRemaining} days remaining`
                : daysRemaining === 0
                ? 'Due today'
                : `${Math.abs(daysRemaining)} days overdue`
              }
            </span>
          </div>
        )}
        
        {!isAchieved && (
          <div className="goal-detail">
            <TrendingUp size={16} />
            <span>{formatCurrency(remaining)} remaining</span>
          </div>
        )}

        {isAchieved && (
          <div className="achievement-badge">
            🎉 Goal Achieved!
          </div>
        )}
      </div>

      {!isAchieved && (
        <div className="goal-actions-footer">
          <button 
            className="btn primary small"
            onClick={onContribute}
          >
            Add Contribution
          </button>
        </div>
      )}
    </div>
  )
}

// Goal Form Component
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
    
    const submitData = {
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      targetDate: formData.targetDate || null
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
          <h2>Create New Goal</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="goal-form">
          <div className="form-group">
            <label>Goal Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Emergency Fund, New Car, Vacation"
              required
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What is this goal for?"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Target Amount (ZAR)</label>
              <input
                type="number"
                name="targetAmount"
                value={formData.targetAmount}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Target Date (Optional)</label>
              <input
                type="date"
                name="targetDate"
                value={formData.targetDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select name="priority" value={formData.priority} onChange={handleChange}>
              <option value={1}>High Priority</option>
              <option value={2}>Medium Priority</option>
              <option value={3}>Low Priority</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Contribute Modal Component
function ContributeModal({ goal, onSubmit, onClose, loading }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState(`Contribution to ${goal.name}`)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      amount: parseFloat(amount),
      description,
      accountId: 1 // Default account since we removed account management
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Contribution</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="goal-summary">
          <h3>{goal.name}</h3>
          <p>Current: {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</p>
          <p>Remaining: {formatCurrency(goal.target_amount - goal.current_amount)}</p>
        </div>

        <form onSubmit={handleSubmit} className="contribute-form">
          <div className="form-group">
            <label>Contribution Amount (ZAR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              max={goal.target_amount - goal.current_amount}
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
