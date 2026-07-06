import { ArrowLeft, CheckCircle2, KeyRound, Mail, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [theme, setTheme] = useState('dark')

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      setSubmitted(true)
      toast.success('Reset link sent!')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
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
            <h1>Check your inbox</h1>
            <p>
              We sent a password reset link to <strong>{email}</strong>.
              It expires in <strong>1 hour</strong>.
            </p>
            <p className="auth-hint">
              Don't see it? Check your spam folder.
            </p>
            <Link to="/login" className="auth-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px', textDecoration: 'none' }}>
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
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
            <KeyRound size={28} />
          </div>
          <h1>Forgot Password?</h1>
          <p>No worries, enter your email and we'll send you a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon-wrap">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                id="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <div className="btn-loading">
                <div className="spinner small"></div>
                Sending link...
              </div>
            ) : (
              <>
                <Mail size={16} />
                Send Reset Link
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
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
