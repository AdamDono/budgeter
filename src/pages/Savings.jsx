import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, PiggyBank, Plus, Target, Trash2, TrendingUp, X, Sparkles } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { savingsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Savings() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddFundsModal, setShowAddFundsModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null })
  const queryClient = useQueryClient()

  const { data: savingsData, isLoading } = useQuery({
    queryKey: ['savings'],
    queryFn: async () => (await savingsAPI.getAll()).data,
  })

  const deleteMutation = useMutation({
    mutationFn: savingsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      toast.success('Pot retired successfully.')
    },
    onError: () => toast.error('Failed to retire pot.')
  })

  const handleDelete = (id) => setDeleteConfirm({ show: true, id })
  const confirmDelete = () => deleteConfirm.id && deleteMutation.mutate(deleteConfirm.id)

  const savings = savingsData?.savings || []
  const totalSavings = savings.reduce((sum, s) => sum + parseFloat(s.balance), 0)

  if (isLoading) return <LoadingSpinner text="Synchronizing buckets..." />

  return (
    <div className="savings-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info">
          <h1>Savings Pots</h1>
          <p className="text-muted">Organize your capital into dedicated growth buckets</p>
        </div>
        <button className="btn primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> New Pot
        </button>
      </header>

      <div className="savings-summary-row">
        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <PiggyBank size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Total Liquidity</span>
            <span className="intel-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(totalSavings)}</span>
          </div>
        </div>
        
        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ width: '40px', height: '40px', background: 'rgba(79, 140, 255, 0.1)', color: '#4f8cff' }}>
            <Target size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Active Buckets</span>
            <span className="intel-value" style={{ fontSize: '1.5rem' }}>{savings.length}</span>
          </div>
        </div>

        <div className="intel-block glass-panel" style={{ padding: '1.5rem' }}>
          <div className="intel-icon" style={{ width: '40px', height: '40px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <Sparkles size={20} />
          </div>
          <div className="intel-content">
            <span className="intel-label" style={{ fontSize: '0.8rem' }}>Avg. Interest</span>
            <span className="intel-value" style={{ fontSize: '1.5rem' }}>
              {(savings.reduce((acc, s) => acc + (parseFloat(s.interest_rate) || 0), 0) / (savings.length || 1)).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div className="goals-glass-grid" style={{ marginTop: '2.5rem' }}>
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
                <button className="tx-action-btn" onClick={() => handleDelete(pot.id)}>
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

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={() => setShowAddFundsModal(pot)}
                  className="btn primary" 
                  style={{ width: 'fit-content', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                >
                  Add Funds <ChevronRight size={14} style={{ marginLeft: '4px' }} />
                </button>
              </div>
            </div>
          )
        })}

        {savings.length === 0 && (
          <div className="savings-empty-state" onClick={() => setShowAddModal(true)}>
            <div className="empty-pot-icon"><Plus size={32} /></div>
            <h3>Initialize Your First Growth Bucket</h3>
            <p className="text-muted">Partition your liquidity into dedicated interest-bearing strategic pots.</p>
          </div>
        )}
      </div>

      {showAddModal && <AddPotModal onClose={() => setShowAddModal(false)} />}
      
      {showAddFundsModal && (
        <AddFundsModal 
          pot={showAddFundsModal} 
          onClose={() => setShowAddFundsModal(null)} 
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Retire Pot?"
        message="Are you sure you want to retire this bucket? Funds will be reallocated to your primary liquidity pool."
        confirmText="Confirm"
        type="danger"
      />
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
        <div className="dash-header" style={{ marginBottom: '1.5rem', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
              placeholder="e.g. Tactical Reserve, Asset Pool"
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
              <label>Target Threshold (Optional)</label>
              <input 
                type="number" 
                step="0.01"
                className="premium-input"
                placeholder="0.00"
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
                placeholder="0.0"
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
        <div className="dash-header" style={{ marginBottom: '1.5rem', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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

