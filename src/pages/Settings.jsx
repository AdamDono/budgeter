import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsAPI } from '../lib/api'
import { User, Bell, Palette, Database, Plus, Edit, Trash2 } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  
  const queryClient = useQueryClient()

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await budgetsAPI.getCategories()).data,
  })

  const createCategoryMutation = useMutation({
    mutationFn: budgetsAPI.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setShowCategoryForm(false)
      toast.success('Category created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create category')
    }
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => budgetsAPI.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setEditingCategory(null)
      toast.success('Category updated successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update category')
    }
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: budgetsAPI.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete category')
    }
  })

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'categories', label: 'Categories', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Privacy', icon: Database },
  ]

  const handleCreateCategory = (formData) => {
    createCategoryMutation.mutate(formData)
  }

  const handleUpdateCategory = (id, formData) => {
    updateCategoryMutation.mutate({ id, data: formData })
  }

  const handleDeleteCategory = (id) => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      deleteCategoryMutation.mutate(id)
    }
  }

  const categories = categoriesData?.categories || []

  if (isLoading) {
    return <LoadingSpinner text="Loading settings..." />
  }

  return (
    <div className="settings-page-v2">
      <div className="bg-glow"></div>
      
      <header className="dash-header">
        <div className="header-info">
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>Settings</h1>
          <p className="text-muted">Manage your account and preferences</p>
        </div>
      </header>

      <div className="settings-container-v2">
        {/* Settings Navigation */}
        <div className="settings-nav-v2">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={`settings-tab-v2 ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Settings Content */}
        <div className="settings-content-v2">
          {activeTab === 'profile' && (
            <ProfileSettings user={user} onLogout={logout} />
          )}
          
          {activeTab === 'categories' && (
            <CategoriesSettings
              categories={categories}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              showForm={showCategoryForm}
              setShowForm={setShowCategoryForm}
              editingCategory={editingCategory}
              setEditingCategory={setEditingCategory}
              loading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            />
          )}
          
          {activeTab === 'notifications' && <NotificationSettings />}
          
          {activeTab === 'data' && <DataSettings />}
        </div>
      </div>
    </div>
  )
}

// Profile Settings Component
function ProfileSettings({ user, onLogout }) {
  return (
    <div className="glass-panel settings-section-v2">
      <h2>Profile Information</h2>
      
      <div className="profile-card-v2">
        <div className="profile-avatar-v2">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="profile-info-v2">
          <h3>{user?.firstName} {user?.lastName}</h3>
          <p>{user?.email}</p>
        </div>
      </div>

      <div className="settings-group-v2">
        <h3>Account Details</h3>
        <div className="form-group-v2">
          <label>First Name</label>
          <input type="text" value={user?.firstName || ''} disabled />
        </div>
        <div className="form-group-v2">
          <label>Last Name</label>
          <input type="text" value={user?.lastName || ''} disabled />
        </div>
        <div className="form-group-v2">
          <label>Email Address</label>
          <input type="email" value={user?.email || ''} disabled />
        </div>
        <p className="form-note">
          Profile editing is coming soon. Contact support to update your information.
        </p>
      </div>

      <div className="settings-group-v2">
        <h3>Account Actions</h3>
        <button 
          className="btn danger"
          onClick={onLogout}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

// Categories Settings Component
function CategoriesSettings({ 
  categories, 
  onCreateCategory, 
  onUpdateCategory, 
  onDeleteCategory,
  showForm,
  setShowForm,
  editingCategory,
  setEditingCategory,
  loading
}) {
  return (
    <div className="glass-panel settings-section-v2">
      <div className="section-header-v2">
        <h2>Budget Categories</h2>
        <button 
          className="btn primary extra-small"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      <p className="section-description">
        Manage your spending categories and monthly budget limits.
      </p>

      <div className="categories-list-v2">
        {categories.map(category => (
          <div key={category.id} className="category-item-v2">
            <div className="category-info-v2">
              <div 
                className="category-color-v2"
                style={{ backgroundColor: category.color || '#6B7280' }}
              ></div>
              <div className="category-details-v2">
                <h4>{category.name}</h4>
                <p>
                  {category.monthly_limit 
                    ? `Monthly limit: R${category.monthly_limit}`
                    : 'No limit set'
                  }
                </p>
              </div>
            </div>
            <div className="category-actions-v2">
              <button 
                className="btn ghost extra-small"
                onClick={() => setEditingCategory(category)}
              >
                <Edit size={16} />
              </button>
              <button 
                className="btn ghost extra-small hover-danger"
                onClick={() => onDeleteCategory(category.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Category Modal */}
      {(showForm || editingCategory) && (
        <CategoryForm
          category={editingCategory}
          onSubmit={editingCategory 
            ? (data) => onUpdateCategory(editingCategory.id, data)
            : onCreateCategory
          }
          onClose={() => {
            setShowForm(false)
            setEditingCategory(null)
          }}
          loading={loading}
        />
      )}
    </div>
  )
}

// Category Form Component
function CategoryForm({ category, onSubmit, onClose, loading }) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    color: category?.color || '#4F8CFF',
    monthlyLimit: category?.monthly_limit || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const submitData = {
      ...formData,
      monthlyLimit: formData.monthlyLimit ? parseFloat(formData.monthlyLimit) : null
    }
    
    onSubmit(submitData)
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const predefinedColors = [
    '#4F8CFF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#EC4899', '#F97316', '#84CC16', '#14B8A6'
  ]

  return (
    <div className="modal-overlay-v2" onClick={onClose}>
      <div className="modal-content-v2" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-v2">
          <h2>{category ? 'Edit Category' : 'Add Category'}</h2>
          <button className="modal-close-v2" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="category-form-v2">
          <div className="form-group-v2">
            <label>Category Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Groceries, Entertainment"
              required
            />
          </div>

          <div className="form-group-v2">
            <label>Color</label>
            <div className="color-picker-v2">
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="color-input-v2"
              />
              <div className="color-presets-v2">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-preset-v2 ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-group-v2">
            <label>Monthly Budget Limit (Optional)</label>
            <input
              type="number"
              name="monthlyLimit"
              value={formData.monthlyLimit}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
            <p className="form-note">
              Set a monthly spending limit for this category to track your budget.
            </p>
          </div>

          <div className="modal-actions-v2">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Saving...' : category ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Notification Settings Component
function NotificationSettings() {
  const [settings, setSettings] = useState({
    budgetAlerts: true,
    goalReminders: true,
    monthlyReports: true,
    emailNotifications: false
  })

  const Toggle = ({ checked, onChange, disabled = false }) => (
    <div 
      className={`toggle-track-v2 ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onChange()}
    >
      <div className="toggle-thumb-v2"></div>
    </div>
  )

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="glass-panel settings-section-v2">
      <h2>Notification Preferences</h2>
      <p className="section-description">
        Choose what notifications you'd like to receive.
      </p>

      <div className="settings-list-v2">
        <div className="setting-item-v2">
          <div className="setting-info-v2">
            <h4>Budget Alerts</h4>
            <p>Get notified when you're close to or over your budget limits</p>
          </div>
          <Toggle checked={settings.budgetAlerts} onChange={() => handleToggle('budgetAlerts')} />
        </div>

        <div className="setting-item-v2">
          <div className="setting-info-v2">
            <h4>Goal Reminders</h4>
            <p>Receive reminders to contribute to your financial goals</p>
          </div>
          <Toggle checked={settings.goalReminders} onChange={() => handleToggle('goalReminders')} />
        </div>

        <div className="setting-item-v2">
          <div className="setting-info-v2">
            <h4>Monthly Reports</h4>
            <p>Get a monthly summary of your spending and savings</p>
          </div>
          <Toggle checked={settings.monthlyReports} onChange={() => handleToggle('monthlyReports')} />
        </div>

        <div className="setting-item-v2 disabled">
          <div className="setting-info-v2">
            <h4>Email Notifications</h4>
            <p>Receive notifications via email (coming soon)</p>
          </div>
          <Toggle checked={settings.emailNotifications} onChange={() => handleToggle('emailNotifications')} disabled />
        </div>
      </div>
    </div>
  )
}

// Data Settings Component
function DataSettings() {
  return (
    <div className="glass-panel settings-section-v2">
      <h2>Data & Privacy</h2>
      <p className="section-description">
        Manage your data and privacy settings.
      </p>

      <div className="settings-list-v2">
        <div className="setting-item-card-v2">
          <h3>Data Storage</h3>
          <p>
            Your financial data is stored securely and encrypted. We never share your 
            personal information with third parties.
          </p>
        </div>

        <div className="setting-item-card-v2">
          <h3>Export Data</h3>
          <p>
            You can export your transaction data at any time from the main dashboard 
            using the Export feature.
          </p>
        </div>

        <div className="setting-item-card-v2 danger">
          <h3 className="text-danger">Delete Account</h3>
          <p>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button className="btn danger extra-small disabled">
            Delete Account (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  )
}
