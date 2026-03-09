import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    idNumber: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}

    if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters'
    }

    if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (formData.idNumber && formData.idNumber.length !== 13) {
      newErrors.idNumber = 'SA ID number must be 13 digits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    
    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      phone: formData.phone || undefined,
      idNumber: formData.idNumber || undefined
    })
    
    setLoading(false)
    
    if (result.success) {
      navigate('/app/dashboard')
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }))
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join thousands managing their finances with Pace Finance</p>
        </div>

        <div className="social-auth">
          <button type="button" className="btn-social google">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
          
          <button type="button" className="btn-social apple">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.05 2.53.68 3.14.68.61 0 1.96-.8 3.5-.74 1.48.05 2.84.58 3.73 1.54-3.2 1.6-2.68 5.76.38 6.94-1.01 2.5-2.03 4.2-2.75 4.55zm-3.14-14.7c.66-1 1.1-2.27.94-3.58-1.12.06-2.45.65-3.23 1.51-.62.67-1.14 1.95-1.02 3.23 1.25.08 2.53-.47 3.31-1.16z" />
            </svg>
            Continue with Apple
          </button>
        </div>

        <div className="auth-divider">
          <span>or sign up with email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
                className={errors.firstName ? 'error' : ''}
                required
              />
              {errors.firstName && <span className="error-text">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter your last name"
                className={errors.lastName ? 'error' : ''}
                required
              />
              {errors.lastName && <span className="error-text">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={errors.email ? 'error' : ''}
              required
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone Number (Optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 0821234567"
              />
            </div>

            <div className="form-group">
              <label htmlFor="idNumber">SA ID Number (Optional)</label>
              <input
                type="text"
                id="idNumber"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                placeholder="13-digit ID number"
                className={errors.idNumber ? 'error' : ''}
                maxLength="13"
              />
              {errors.idNumber && <span className="error-text">{errors.idNumber}</span>}
            </div>
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
                placeholder="Create a strong password"
                className={errors.password ? 'error' : ''}
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
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={errors.confirmPassword ? 'error' : ''}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          <button 
            type="submit" 
            className="auth-submit"
            disabled={loading}
          >
            {loading ? (
              <div className="btn-loading">
                <div className="spinner small"></div>
                Creating account...
              </div>
            ) : (
              <>
                <UserPlus size={16} />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      <div className="auth-bg">
        <div className="auth-bg-content">
          <div className="auth-bg-logo">
            <img src="/logo_pace_finance.svg" alt="Pace Finance" className="logo-image-bg" />
          </div>
          <h2>Your AI-Powered Financial Strategist</h2>
          <p>
            Join thousands deploying autonomous cashflow and tactical debt eradication.
          </p>
        </div>
      </div>

      <Link to="/landing" className="about-link">
        About Us
      </Link>
    </div>
  )
}
