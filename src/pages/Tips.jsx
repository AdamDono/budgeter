import React, { useState } from 'react'
import { Heart, Share2, MessageCircle, TrendingUp, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Tips() {
  const [tips, setTips] = useState(defaultTips)
  const [likedTips, setLikedTips] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'All Tips', icon: '💡' },
    { id: 'saving', name: 'Saving', icon: '💰' },
    { id: 'budgeting', name: 'Budgeting', icon: '📊' },
    { id: 'investing', name: 'Investing', icon: '📈' },
    { id: 'debt', name: 'Debt', icon: '💳' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '🎯' },
  ]

  const handleLike = (tipId) => {
    if (likedTips.includes(tipId)) {
      setLikedTips(likedTips.filter(id => id !== tipId))
    } else {
      setLikedTips([...likedTips, tipId])
      toast.success('Tip saved!')
    }
  }

  const handleShare = (tip) => {
    const text = `Check out this budget tip: "${tip.title}" - ${tip.description}`
    if (navigator.share) {
      navigator.share({
        title: 'Budget Tip',
        text: text,
      })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard!')
    }
  }

  const handleAddTip = (formData) => {
    const newTip = {
      id: Date.now(),
      ...formData,
      author: 'You',
      likes: 0,
      date: new Date().toLocaleDateString(),
    }
    setTips([newTip, ...tips])
    setShowAddForm(false)
    toast.success('Tip shared!')
  }

  const filteredTips = selectedCategory === 'all' 
    ? tips 
    : tips.filter(tip => tip.category === selectedCategory)

  return (
    <div className="tips-page">
      <div className="page-header">
        <div>
          <h1>Budget Tips & Tricks</h1>
          <p>Learn from the community and share your financial wisdom</p>
        </div>
        <button
          className="btn primary"
          onClick={() => setShowAddForm(true)}
        >
          <Lightbulb size={16} />
          Share a Tip
        </button>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="icon">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Tips Grid */}
      <div className="tips-grid">
        {filteredTips.length > 0 ? (
          filteredTips.map(tip => (
            <div key={tip.id} className="tip-card">
              <div className="tip-header">
                <div className="tip-category">
                  <span className="category-badge">{tip.category}</span>
                </div>
                <div className="tip-meta">
                  <span className="author">{tip.author}</span>
                  <span className="date">{tip.date}</span>
                </div>
              </div>

              <div className="tip-content">
                <h3>{tip.title}</h3>
                <p>{tip.description}</p>
                {tip.details && (
                  <div className="tip-details">
                    {tip.details.map((detail, idx) => (
                      <div key={idx} className="detail-item">
                        <span className="bullet">✓</span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="tip-footer">
                <div className="tip-stats">
                  <span className="stat">
                    <Heart size={16} />
                    {tip.likes + (likedTips.includes(tip.id) ? 1 : 0)}
                  </span>
                  <span className="stat">
                    <MessageCircle size={16} />
                    {tip.comments || 0}
                  </span>
                </div>

                <div className="tip-actions">
                  <button
                    className={`action-btn ${likedTips.includes(tip.id) ? 'liked' : ''}`}
                    onClick={() => handleLike(tip.id)}
                  >
                    <Heart size={16} />
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => handleShare(tip)}
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Lightbulb size={48} />
            <h3>No Tips Yet</h3>
            <p>Be the first to share a budget tip!</p>
            <button
              className="btn primary"
              onClick={() => setShowAddForm(true)}
            >
              Share Your First Tip
            </button>
          </div>
        )}
      </div>

      {/* Add Tip Modal */}
      {showAddForm && (
        <AddTipForm
          onSubmit={handleAddTip}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}

function AddTipForm({ onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'saving',
    details: [''],
  })

  const categories = [
    'saving',
    'budgeting',
    'investing',
    'debt',
    'lifestyle',
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      details: formData.details.filter(d => d.trim()),
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDetailChange = (idx, value) => {
    const newDetails = [...formData.details]
    newDetails[idx] = value
    setFormData(prev => ({
      ...prev,
      details: newDetails
    }))
  }

  const addDetailField = () => {
    setFormData(prev => ({
      ...prev,
      details: [...prev.details, '']
    }))
  }

  const removeDetailField = (idx) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== idx)
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share a Budget Tip</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="tip-form">
          <div className="form-group">
            <label>Tip Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., 50/30/20 Budget Rule"
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select name="category" value={formData.category} onChange={handleChange}>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Explain your tip in detail..."
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Key Points (Optional)</label>
            {formData.details.map((detail, idx) => (
              <div key={idx} className="detail-input">
                <input
                  type="text"
                  value={detail}
                  onChange={(e) => handleDetailChange(idx, e.target.value)}
                  placeholder={`Point ${idx + 1}`}
                />
                {formData.details.length > 1 && (
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => removeDetailField(idx)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn ghost"
              onClick={addDetailField}
            >
              + Add Point
            </button>
          </div>

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Share Tip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Default tips
const defaultTips = [
  {
    id: 1,
    title: '50/30/20 Budget Rule',
    description: 'Allocate 50% of income to needs, 30% to wants, and 20% to savings. This simple framework helps you maintain balance.',
    category: 'budgeting',
    author: 'Finance Expert',
    date: '2024-11-15',
    likes: 245,
    comments: 32,
    details: [
      '50% for essentials (rent, food, utilities)',
      '30% for discretionary spending (entertainment, dining)',
      '20% for savings and debt repayment'
    ]
  },
  {
    id: 2,
    title: 'Automate Your Savings',
    description: 'Set up automatic transfers to a savings account right after payday. Out of sight, out of mind!',
    category: 'saving',
    author: 'Money Coach',
    date: '2024-11-14',
    likes: 189,
    comments: 24,
    details: [
      'Transfer 10-20% of salary automatically',
      'Use a separate bank account you don\'t see daily',
      'Increase percentage with every raise'
    ]
  },
  {
    id: 3,
    title: 'Track Every Expense',
    description: 'Use apps to log all spending. Awareness is the first step to better financial habits.',
    category: 'budgeting',
    author: 'Budget Master',
    date: '2024-11-13',
    likes: 156,
    comments: 18,
    details: [
      'Log expenses within 24 hours',
      'Categorize spending properly',
      'Review weekly to spot patterns'
    ]
  },
  {
    id: 4,
    title: 'Debt Snowball Method',
    description: 'Pay off smallest debts first for psychological wins, then roll payments into larger debts.',
    category: 'debt',
    author: 'Debt Free',
    date: '2024-11-12',
    likes: 312,
    comments: 45,
    details: [
      'List debts from smallest to largest',
      'Pay minimum on all, extra on smallest',
      'Celebrate each payoff milestone'
    ]
  },
  {
    id: 5,
    title: 'Build an Emergency Fund',
    description: 'Save 3-6 months of expenses for unexpected situations. This prevents debt when emergencies hit.',
    category: 'saving',
    author: 'Financial Advisor',
    date: '2024-11-11',
    likes: 278,
    comments: 38,
    details: [
      'Start with R1,000-R5,000',
      'Keep in easily accessible account',
      'Don\'t touch unless true emergency'
    ]
  },
  {
    id: 6,
    title: 'Use the 30-Day Rule',
    description: 'Wait 30 days before making non-essential purchases. Most impulse urges fade away.',
    category: 'lifestyle',
    author: 'Minimalist',
    date: '2024-11-10',
    likes: 201,
    comments: 29,
    details: [
      'Add item to wishlist instead',
      'Wait full 30 days',
      'If still want it, consider buying'
    ]
  },
]
