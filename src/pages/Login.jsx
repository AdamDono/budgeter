import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await login(formData.email, formData.password)
    
    setLoading(false)
    
    if (!result.success) {
      // Error is already shown via toast in AuthContext
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your Budgeter account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-submit"
            disabled={loading}
          >
            {loading ? (
              <div className="btn-loading">
                <div className="spinner small"></div>
                Signing in...
              </div>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Sign up here
            </Link>
          </p>
        </div>
      </div>

      <div className="auth-bg">
        <div className="auth-bg-content">
          <h2>Take Control of Your Finances</h2>
          <p>
            Track expenses, set goals, and build better financial habits with 
            South Africa's most intuitive budgeting app.
          </p>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">💰</span>
              <span>Smart Budget Tracking</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span>Goal-Based Savings</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Detailed Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
