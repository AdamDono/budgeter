import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { Lock, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match')
    }
    if (password.length < 8) {
      return toast.error('Password must be at least 8 characters long')
    }

    setLoading(true)
    try {
      await authAPI.resetPassword(token, { password })
      setSuccess(true)
      toast.success('Password reset successfully!')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid or expired reset token')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card" style={{ textAlign: 'center' }}>
            <div className="auth-icon-container success">
              <CheckCircle2 size={48} className="auth-icon" />
            </div>
            <h1>Password Reset!</h1>
            <p style={{ color: '#8e97a4', marginBottom: '32px' }}>
              Your password has been successfully updated. You can now use your new password to sign in.
            </p>
            <button className="login-btn" onClick={() => navigate('/login')}>
              Sign In Now
            </button>
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
            <Lock size={48} className="auth-icon" />
          </div>
          <h1>Create New Password</h1>
          <p style={{ color: '#8e97a4', marginBottom: '32px' }}>
            Choose a strong password that you haven't used before.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-with-icon">
                <ShieldAlert size={18} />
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Updating...' : 'Reset password'}
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
