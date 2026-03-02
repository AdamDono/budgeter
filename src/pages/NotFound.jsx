import { ArrowLeft, Home } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="not-found-graphic">
          <div className="error-code">404</div>
          <div className="error-pulse"></div>
        </div>

        <h1>Page Not Found</h1>
        <p>
          Oops! The page you're looking for doesn't exist or has been moved.
          <br />
          Let's get you back on track.
        </p>

        <div className="not-found-actions">
          <button className="btn ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            Go Back
          </button>
          <Link to="/app/dashboard" className="btn primary">
            <Home size={18} />
            Go to Dashboard
          </Link>
        </div>

        <div className="not-found-suggestions">
          <p>Looking for something? Try these:</p>
          <div className="suggestion-links">
            <Link to="/app/dashboard">📊 Dashboard</Link>
            <Link to="/app/transactions">💳 Transactions</Link>
            <Link to="/app/goals">🎯 Goals</Link>
            <Link to="/app/savings">💰 Savings</Link>
            <Link to="/landing">🏠 Home Page</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
