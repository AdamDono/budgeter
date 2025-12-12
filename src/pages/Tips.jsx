import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tipsAPI } from '../lib/api'
import { Heart, Share2, MessageCircle, TrendingUp, Lightbulb } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Tips() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [likedTips, setLikedTips] = useState([])

  const { data: tipsData, isLoading } = useQuery({
    queryKey: ['tips', selectedCategory],
    queryFn: async () => (await tipsAPI.getAll(selectedCategory)).data,
  })

  const handleLike = (tipId) => {
    if (likedTips.includes(tipId)) {
      setLikedTips(likedTips.filter(id => id !== tipId))
      toast.success('Tip removed from saved')
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

  if (isLoading) {
    return <LoadingSpinner text="Loading tips..." />
  }

  const tips = tipsData?.tips || defaultTips

  const categories = [
    { id: 'all', name: 'All Tips', icon: '💡' },
    { id: 'saving', name: 'Saving', icon: '💰' },
    { id: 'budgeting', name: 'Budgeting', icon: '📊' },
    { id: 'investing', name: 'Investing', icon: '📈' },
    { id: 'debt', name: 'Debt', icon: '💳' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '🎯' },
  ]

  const filteredTips = selectedCategory === 'all' 
    ? tips 
    : tips.filter(tip => tip.category === selectedCategory)

  return (
    <div className="tips-page">
      <div className="page-header">
        <div>
          <h1>Budget Tips & Tricks</h1>
          <p>Learn from the community and improve your financial habits</p>
        </div>
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
            <h3>No Tips Available</h3>
            <p>Check back soon for budget tips from our community!</p>
          </div>
        )}
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
