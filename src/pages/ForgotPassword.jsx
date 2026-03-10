import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { KeyRound, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await authAPI.forgotPassword({ email })
      setSubmitted(true)
      toast.success('Reset link sent if account exists!')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card" style={{ textAlign: 'center' }}>
            <div className="auth-icon-container success">
              <CheckCircle2 size={48} className="auth-icon" />
            </div>
            <h1>Check your email</h1>
            <p style={{ color: '#8e97a4', marginBottom: '24px' }}>
              If an account with <strong>{email}</strong> exists, we've sent instructions to reset your password.
            </p>
            <p style={{ fontSize: '14px', color: '#526071' }}>
              Note: During development, please check the backend terminal console for the reset link!
            </p>
            <div className="auth-footer" style={{ marginTop: '32px' }}>
              <Link to="/login" className="back-to-login">
                <ArrowLeft size={16} />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="auth-icon-container">
            <KeyRound size={48} className="auth-icon" />
          </div>
          <h1>Reset Password</h1>
          <p style={{ color: '#8e97a4', marginBottom: '32px' }}>
            Enter your email and we'll send you a link to get back into your account.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Sending link...' : 'Send reset link'}
            </button>
          </form>

          <div className="auth-footer">
            <Link to="/login" className="back-to-login">
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
