
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, PiggyBank, Plus, Target, Trash2, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { savingsAPI } from '../lib/api'
import { formatCurrency } from '../utils/format'

export default function Savings() {
  const [showAddModal, setShowAddModal] = useState(false)
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
      toast.success('Savings pot deleted')
    }
  })

  const handleDelete = (id) => setDeleteConfirm({ show: true, id })
  const confirmDelete = () => {
    if (deleteConfirm.id) deleteMutation.mutate(deleteConfirm.id)
  }

  const savings = savingsData?.savings || []
  const totalSavings = savings.reduce((sum, s) => sum + parseFloat(s.balance), 0)

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="savings-page">
      <div className="page-header">
        <div>
          <h1>Savings Pots</h1>
          <p>Organize your money into dedicated growth buckets</p>
        </div>
        <button className="btn primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          Create New Pot
        </button>
      </div>

      <div className="summary-grid">
        <div className="summary-card savings">
          <div className="summary-icon">
            <PiggyBank size={24} />
          </div>
          <div className="summary-content">
            <h3>Total Savings</h3>
            <p className="summary-amount">{formatCurrency(totalSavings)}</p>
          </div>
        </div>
        
        <div className="summary-card pots">
          <div className="summary-icon">
            <Target size={24} />
          </div>
          <div className="summary-content">
            <h3>Active Pots</h3>
            <p className="summary-amount">{savings.length}</p>
          </div>
        </div>
      </div>

      <div className="savings-grid">
        {savings.map(pot => {
          const progress = pot.target_amount ? (parseFloat(pot.balance) / parseFloat(pot.target_amount)) * 100 : 0
          
          return (
            <div key={pot.id} className="pot-card">
              <div className="pot-header">
                <div className="pot-icon" style={{ backgroundColor: pot.color + '20', color: pot.color }}>
                   <PiggyBank size={20} />
                </div>
                <button className="delete-pot" onClick={() => handleDelete(pot.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div className="pot-info">
                <h3>{pot.name}</h3>
                <div className="pot-balance">
                  <span className="current">{formatCurrency(pot.balance)}</span>
                  {pot.target_amount && (
                    <span className="target">of {formatCurrency(pot.target_amount)}</span>
                  )}
                </div>
              </div>

              {pot.target_amount && (
                <div className="pot-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: pot.color }}
                    ></div>
                  </div>
                  <div className="progress-labels">
                    <span>{Math.round(progress)}%</span>
                    <span>{formatCurrency(parseFloat(pot.target_amount) - parseFloat(pot.balance))} left</span>
                  </div>
                </div>
              )}

              <div className="pot-footer">
                <div className="interest-badge">
                  <TrendingUp size={12} />
                  {pot.interest_rate}% APR
                </div>
                <a href="/app/transactions" className="add-funds">
                  Add Funds <ChevronRight size={14} />
                </a>
              </div>
            </div>
          )
        })}

        {savings.length === 0 && (
          <div className="empty-state-pot" onClick={() => setShowAddModal(true)}>
            <div className="plus-icon"><Plus size={32} /></div>
            <h3>Create your first savings pot</h3>
            <p>Divide your money for specific goals like "Emergency Fund" or "New Car"</p>
          </div>
        )}
      </div>

      {showAddModal && <AddPotModal onClose={() => setShowAddModal(false)} />}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Pot?"
        message="Are you sure you want to delete this savings pot? The funds will be returned to your main balance."
        confirmText="Delete"
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
    color: '#10B981'
  })

  const createMutation = useMutation({
    mutationFn: savingsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      toast.success('Savings pot created!')
      onClose()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      balance: parseFloat(formData.balance) || 0,
      targetAmount: parseFloat(formData.targetAmount) || null,
      interestRate: parseFloat(formData.interestRate) || 0,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Savings Pot</h2>
          <button onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="pot-form">
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Emergency Fund"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Starting Balance</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={formData.balance}
                onChange={e => setFormData({...formData, balance: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Target Amount (Optional)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={formData.targetAmount}
                onChange={e => setFormData({...formData, targetAmount: e.target.value})}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Interest Rate (%)</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="0.0"
                value={formData.interestRate}
                onChange={e => setFormData({...formData, interestRate: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Color Tag</label>
              <input 
                type="color"
                value={formData.color}
                onChange={e => setFormData({...formData, color: e.target.value})}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Pot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
