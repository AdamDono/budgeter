import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Moon, ShieldCheck, Sun } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../lib/api'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [theme, setTheme] = useState('dark')

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const passwordStrength = () => {
    if (password.length === 0) return null
    if (password.length < 8) return 'weak'
    if (password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'medium'
    return 'strong'
  }

  const strength = passwordStrength()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) return toast.error('Passwords do not match')
    if (password.length < 8) return toast.error('Password must be at least 8 characters')

    setLoading(true)
    try {
      await authAPI.resetPassword(token, { password })
      setSuccess(true)
      toast.success('Password updated!')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid or expired reset link')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={`auth-page ${theme}-mode`}>
        <button className="theme-toggle-btn auth-theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="auth-container">
          <div className="auth-success-state">
            <div className="auth-success-icon">
              <CheckCircle2 size={52} />
            </div>
            <h1>Password Updated!</h1>
            <p>Your password has been successfully changed. You can now sign in with your new password.</p>
            <button className="auth-submit" onClick={() => navigate('/login')} style={{ marginTop: '8px' }}>
              Sign In Now
            </button>
          </div>
        </div>

        <div className="auth-bg">
          <div className="auth-bg-content">
            <div className="auth-bg-logo">
              <img src="/logo_pace_finance.svg" alt="Pace Finance" className="logo-image-bg" />
            </div>
            <h2>Security First</h2>
            <p>Your financial data is protected with bank-level encryption and secure authentication.</p>
          </div>
        </div>
        <Link to="/landing" className="about-link">About Us</Link>
      </div>
    )
  }

  return (
    <div className={`auth-page ${theme}-mode`}>
      <button className="theme-toggle-btn auth-theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            <ShieldCheck size={28} />
          </div>
          <h1>Create New Password</h1>
          <p>Choose a strong password you haven't used before.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="input-with-icon-wrap">
              <Lock size={16} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {/* Password strength bar */}
            {strength && (
              <div className="password-strength">
                <div className={`strength-bar ${strength}`}>
                  <div className="strength-fill" />
                </div>
                <span className={`strength-label ${strength}`}>
                  {strength === 'weak' ? 'Too short' : strength === 'medium' ? 'Medium' : 'Strong'}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-with-icon-wrap">
              <Lock size={16} className="input-icon" />
              <input
                type={showConfirm ? 'text' : 'password'}
                id="confirmPassword"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <span className="field-error">Passwords don't match</span>
            )}
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <div className="btn-loading">
                <div className="spinner small"></div>
                Updating...
              </div>
            ) : (
              <>
                <ShieldCheck size={16} />
                Reset Password
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={14} /> Back to Sign In
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
          <p>Join thousands deploying autonomous cashflow and tactical debt eradication.</p>
        </div>
      </div>

      <Link to="/landing" className="about-link">About Us</Link>
    </div>
  )
}
