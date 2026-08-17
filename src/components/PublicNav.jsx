import { Link } from 'react-router-dom'
import '../styles/legal.css'

export default function PublicNav() {
  return (
    <header className="legal-nav">
      <div className="container">
        <Link to="/landing" className="legal-nav-logo">
          <img src="/logo_pace_finance.svg" alt="Pace Finance" />
        </Link>
        <nav className="legal-nav-links">
          <Link to="/landing" className="legal-nav-link">Home</Link>
          <Link to="/security" className="legal-nav-link">Security</Link>
          <Link to="/terms" className="legal-nav-link">Terms</Link>
          <Link to="/privacy" className="legal-nav-link">Privacy</Link>
          <Link to="/contact" className="legal-nav-link">Contact</Link>
          <Link to="/register" className="legal-nav-btn">Get Started</Link>
        </nav>
      </div>
    </header>
  )
}
