import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  ChevronRight,
  PiggyBank,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { accountsAPI, goalsAPI, savingsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Savings() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(
    location.pathname.includes('/goals') ? 'goals' : 'pots'
  )

  useEffect(() => {
    if (location.pathname.includes('/goals')) {
      setActiveTab('goals')
    }
  }, [location.pathname])

  // Pots state
  const [showAddPotModal, setShowAddPotModal] = useState(false)
  const [showAddFundsModal, setShowAddFundsModal] = useState(null)
  const [deletePotConfirm, setDeletePotConfirm] = useState({ show: false, id: null })

  // Goals state
  const [showAddGoalForm, setShowAddGoalForm] = useState(false)
  const [showContributeModal, setShowContributeModal] = useState(null)
  const [deleteGoalConfirm, setDeleteGoalConfirm] = useState({ show: false, id: null })

  const queryClient = useQueryClient()

  const { data: savingsData, isLoading: loadingSavings } = useQuery({
    queryKey: ['savings'],
    queryFn: async () => (await savingsAPI.getAll()).data,
  })

  const { data: goalsData, isLoading: loadingGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => (await goalsAPI.getAll()).data,
  })

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await accountsAPI.getAll()).data,
  })

  const deletePotMutation = useMutation({
    mutationFn: savingsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      toast.success('Pot retired successfully.')
    },
    onError: () => toast.error('Failed to retire pot.')
  })

  const createGoalMutation = useMutation({
    mutationFn: goalsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      setShowAddGoalForm(false)
      toast.success('Goal established successfully!')
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to create goal')
  })

  const deleteGoalMutation = useMutation({
    mutationFn: goalsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal removed.')
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to delete goal')
  })

  const contributeGoalMutation = useMutation({
    mutationFn: ({ goalId, data }) => goalsAPI.contribute(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowContributeModal(null)
      toast.success('Contribution processed.')
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to add contribution')
  })

  if (loadingSavings || loadingGoals) {
    return <LoadingSpinner text="Synchronizing savings & goals..." />
  }

  const savings = savingsData?.savings || []
  const goals = goalsData?.goals || []
  const totalSavings = savings.reduce((sum, s) => sum + parseFloat(s.balance || 0), 0)
  const totalGoalSaved = goals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0)

  return (
    <div className="savings-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info dashboard-header-info">
          <h1>Savings & Goals</h1>
          <p className="text-muted dash-subtitle">Grow your liquidity in interest-bearing pots and track target milestones</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          {activeTab === 'pots' ? (
            <button className="btn primary" onClick={() => setShowAddPotModal(true)}>
              <Plus size={18} /> New Savings Pot
            </button>
          ) : (
            <button className="btn primary" onClick={() => setShowAddGoalForm(true)}>
              <Plus size={18} /> New Target Goal
            </button>
          )}
        </div>
      </header>

      {/* Top Summary Row */}
      <div className="savings-summary-row">
        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <PiggyBank size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Savings Pots Liquidity</span>
            <span className="intel-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(totalSavings)}</span>
          </div>
        </div>
        
        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ width: '40px', height: '40px', background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <Target size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Goals Accumulated</span>
            <span className="intel-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(totalGoalSaved)}</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ width: '40px', height: '40px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <Sparkles size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Avg. Pot Yield</span>
            <span className="intel-value" style={{ fontSize: '1.5rem' }}>
              {(savings.reduce((acc, s) => acc + (parseFloat(s.interest_rate) || 0), 0) / (savings.length || 1)).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Unified Segmented Tab Switcher */}
      <div
        className="glass-panel"
        style={{
          display: 'inline-flex',
          padding: '0.35rem',
          borderRadius: '14px',
          gap: '0.35rem',
          marginTop: '1.75rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.07)'
        }}
      >
        <button
          className={`btn small ${activeTab === 'pots' ? 'primary' : 'ghost'}`}
          style={{ borderRadius: '10px', padding: '0.6rem 1.25rem' }}
          onClick={() => setActiveTab('pots')}
        >
          <PiggyBank size={16} /> Savings Pots ({savings.length})
        </button>
        <button
          className={`btn small ${activeTab === 'goals' ? 'primary' : 'ghost'}`}
          style={{ borderRadius: '10px', padding: '0.6rem 1.25rem' }}
          onClick={() => setActiveTab('goals')}
        >
          <Target size={16} /> Target Goals ({goals.length})
        </button>
      </div>

      {/* TAB 1: SAVINGS POTS */}
      {activeTab === 'pots' && (
        <div className="goals-glass-grid" style={{ marginTop: '2rem' }}>
          {savings.map(pot => {
            const progress = pot.target_amount ? (parseFloat(pot.balance) / parseFloat(pot.target_amount)) * 100 : 0
            
            return (
              <div key={pot.id} className="pot-glass-card">
                <div className="pot-card-header">
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="pot-brand-icon" style={{ backgroundColor: pot.color + '15', color: pot.color }}>
                      <PiggyBank size={20} />
                    </div>
                    <div className="pot-main-info">
                      <h3>{pot.name}</h3>
                      <div className="pot-yield-badge">
                        <TrendingUp size={12} /> {pot.interest_rate}% Yield
                      </div>
                    </div>
                  </div>
                  <button className="tx-action-btn" onClick={() => setDeletePotConfirm({ show: true, id: pot.id })}>
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="pot-balance-section">
                  <div className="pot-current-val">{formatCurrency(pot.balance)}</div>
                  {pot.target_amount && (
                    <div className="pot-target-val">Target: {formatCurrency(pot.target_amount)}</div>
                  )}
                </div>

                {pot.target_amount && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="pot-progress-container">
                      <div 
                        className="pot-progress-fill" 
                        style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: pot.color }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                      <span>{Math.round(progress)}% Complete</span>
                      <span>{formatCurrency(Math.max(0, parseFloat(pot.target_amount) - parseFloat(pot.balance)))} left</span>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setShowAddFundsModal(pot)}
                  className="btn primary pot-action-btn" 
                >
                  Add Funds <ChevronRight size={14} style={{ marginLeft: '4px' }} />
                </button>
              </div>
            )
          })}

          {savings.length === 0 && (
            <div className="savings-empty-state" onClick={() => setShowAddPotModal(true)}>
              <div className="empty-pot-icon"><Plus size={32} /></div>
              <h3>Initialize Your First Savings Pot</h3>
              <p className="text-muted">Partition your liquidity into dedicated interest-bearing emergency or TFSA pots.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TARGET GOALS */}
      {activeTab === 'goals' && (
        <div className="goals-glass-grid" style={{ marginTop: '2rem' }}>
          {goals.length > 0 ? (
            goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onDelete={(id) => setDeleteGoalConfirm({ show: true, id })}
                onContribute={() => setShowContributeModal(goal)}
              />
            ))
          ) : (
            <div className="savings-empty-state" onClick={() => setShowAddGoalForm(true)}>
              <div className="empty-pot-icon"><Target size={32} /></div>
              <h3>No Target Goals Set Yet</h3>
              <p className="text-muted">Define a milestone with a deadline (e.g. Home Deposit, December Holiday) and track your progress.</p>
            </div>
          )}
        </div>
      )}

      {/* Modals for Pots */}
      {showAddPotModal && <AddPotModal onClose={() => setShowAddPotModal(false)} />}
      {showAddFundsModal && (
        <AddFundsModal 
          pot={showAddFundsModal} 
          onClose={() => setShowAddFundsModal(null)} 
        />
      )}
      <ConfirmModal
        isOpen={deletePotConfirm.show}
        onClose={() => setDeletePotConfirm({ show: false, id: null })}
        onConfirm={() => deletePotConfirm.id && deletePotMutation.mutate(deletePotConfirm.id)}
        title="Retire Pot?"
        message="Are you sure you want to retire this bucket? Funds will be reallocated to your primary liquidity pool."
        confirmText="Confirm"
        type="danger"
      />

      {/* Modals for Goals */}
      {showAddGoalForm && (
        <GoalForm
          onSubmit={(data) => createGoalMutation.mutate(data)}
          onClose={() => setShowAddGoalForm(false)}
          loading={createGoalMutation.isPending}
        />
      )}
      {showContributeModal && (
        <ContributeModal
          goal={showContributeModal}
          accounts={accountsData?.accounts || []}
          onSubmit={(data) => contributeGoalMutation.mutate({ goalId: showContributeModal.id, data })}
          onClose={() => setShowContributeModal(null)}
          loading={contributeGoalMutation.isPending}
        />
      )}
      <ConfirmModal
        isOpen={deleteGoalConfirm.show}
        onClose={() => setDeleteGoalConfirm({ show: false, id: null })}
        onConfirm={() => deleteGoalConfirm.id && deleteGoalMutation.mutate(deleteGoalConfirm.id)}
        title="Delete Goal?"
        message="Are you sure you want to remove this goal? History will be preserved but target tracking will end."
        confirmText="Delete"
        type="danger"
      />
    </div>
  )
}

function GoalCard({ goal, onDelete, onContribute }) {
  const progressPercentage = Math.min(100, parseFloat(goal.progress_percentage) || 0)
  const isAchieved = goal.is_achieved || progressPercentage >= 100
  const remaining = Math.max(0, parseFloat(goal.target_amount) - parseFloat(goal.current_amount))
  
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
          className="btn primary goal-action-btn" 
          onClick={onContribute}
        >
          Contribute to Goal
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
        <div className="modal-header-v2">
          <div className="header-info">
            <h2 style={{ fontSize: '1.5rem', color: 'white' }}>New Target Goal</h2>
            <p className="text-muted">Define a new financial objective with a deadline</p>
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

function ContributeModal({ goal, accounts = [], onSubmit, onClose, loading }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState(`Contribution to ${goal.name}`)
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '')

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ 
      amount: parseFloat(amount), 
      description, 
      accountId: selectedAccountId ? parseInt(selectedAccountId) : null 
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-modal shadow-2xl small" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
         <div className="modal-header-v2">
          <div className="header-info">
            <h2 style={{ fontSize: '1.3rem', color: 'white' }}>Contribute to Goal</h2>
            <p className="text-muted">{goal.name}</p>
          </div>
          <button className="btn ghost small" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
          <div className="intel-block" style={{ marginBottom: '1.5rem', justifyContent: 'space-between' }}>
            <span className="text-muted">Current Progress</span>
            <span className="text-accent">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
          </div>

          <div className="premium-form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Amount (ZAR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="premium-input"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          {accounts.length > 0 && (
            <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Contribute From Account</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="premium-input select"
                required
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Balance: {formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

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

function AddPotModal({ onClose }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    balance: '',
    targetAmount: '',
    interestRate: '',
    color: '#4F8CFF'
  })

  const [loading, setLoading] = useState(false)

  const createMutation = useMutation({
    mutationFn: savingsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      toast.success('New growth bucket online.')
      onClose()
    },
    onSettled: () => setLoading(false)
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    createMutation.mutate({
      ...formData,
      balance: parseFloat(formData.balance) || 0,
      targetAmount: parseFloat(formData.targetAmount) || null,
      interestRate: parseFloat(formData.interestRate) || 0,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-modal shadow-2xl" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header-v2">
          <div className="header-info">
            <h2 style={{ fontSize: '1.5rem', color: 'white' }}>New Savings Pot</h2>
            <p className="text-muted">Initialize a strategic capital bucket</p>
          </div>
          <button className="btn ghost small" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
          <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Bucket Label</label>
            <input 
              type="text" 
              required 
              className="premium-input"
              placeholder="e.g. Emergency Reserve, EasyEquities TFSA"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="premium-form-group">
              <label>Starting Capital (ZAR)</label>
              <input 
                type="number" 
                step="0.01"
                className="premium-input"
                placeholder="0.00"
                value={formData.balance}
                onChange={e => setFormData({...formData, balance: e.target.value})}
              />
            </div>

            <div className="premium-form-group">
              <label>Target Cap (Optional ZAR)</label>
              <input 
                type="number" 
                step="0.01"
                className="premium-input"
                placeholder="e.g. 36000"
                value={formData.targetAmount}
                onChange={e => setFormData({...formData, targetAmount: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="premium-form-group">
              <label>Yield Rate (% APR)</label>
              <input 
                type="number" 
                step="0.1"
                className="premium-input"
                placeholder="e.g. 8.5"
                value={formData.interestRate}
                onChange={e => setFormData({...formData, interestRate: e.target.value})}
              />
            </div>
            <div className="premium-form-group">
              <label>Accent Protocol</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="color"
                  className="premium-input"
                  style={{ width: '40px', height: '40px', padding: '2px', cursor: 'pointer' }}
                  value={formData.color}
                  onChange={e => setFormData({...formData, color: e.target.value})}
                />
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>{formData.color.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn danger" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Processing...' : 'Init Bucket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddFundsModal({ pot, onClose }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const fundMutation = useMutation({
    mutationFn: (data) => savingsAPI.addFunds(pot.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`Funds added to ${pot.name}`)
      onClose()
    },
    onSettled: () => setLoading(false)
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!amount || amount <= 0) return toast.error('Please enter a valid amount')
    setLoading(true)
    fundMutation.mutate({ amount: parseFloat(amount), description })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-modal shadow-2xl" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header-v2">
          <div className="header-info">
            <h2 style={{ fontSize: '1.25rem', color: 'white' }}>Add Funds</h2>
            <p className="text-muted">To: {pot.name}</p>
          </div>
          <button className="btn ghost small" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
          <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Amount (ZAR)</label>
            <input 
              type="number" 
              step="0.01" 
              autoFocus
              className="premium-input"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="premium-form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Reference (Optional)</label>
            <input 
              type="text" 
              className="premium-input"
              placeholder="e.g. Monthly top-up"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn danger" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Addition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
