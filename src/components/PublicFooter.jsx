import { Facebook, Linkedin, Twitter, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../styles/landing.css'

export default function PublicFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo_pace_finance.svg" alt="Pace Finance" className="footer-logo-image" />
            </div>
            <p className="footer-tagline">
              The AI-driven wealth-builder that turns every Rand into a mission. Master your debt and build lasting freedom.
            </p>
            <div className="footer-social">
              <a href="#" className="social-link" aria-label="X (Twitter)"><Twitter size={18} /></a>
              <a href="#" className="social-link" aria-label="LinkedIn"><Linkedin size={18} /></a>
              <a href="#" className="social-link" aria-label="Facebook"><Facebook size={18} /></a>
              <a href="#" className="social-link" aria-label="TikTok"><Video size={18} /></a>
            </div>
          </div>

          <div className="footer-section">
            <h4>Platform</h4>
            <Link to="/landing#services-cards">Tactical Debt Tracker</Link>
            <Link to="/landing#services-cards">Actionable Credit Hub</Link>
            <Link to="/landing#services-cards">Autonomous Cashflow</Link>
            <Link to="/landing#ai-coach">24/7 AI Coach</Link>
            <Link to="/register">Get Started</Link>
          </div>

          <div className="footer-section">
            <h4>Calculators & Tools</h4>
            <Link to="/landing#services-cards">Debt Snowball Engine</Link>
            <Link to="/landing#services-cards">Interest Saved Tracker</Link>
            <Link to="/landing#services-cards">Credit Score Simulator</Link>
            <Link to="/login">Client Portal</Link>
            <Link to="/contact">Help Center</Link>
          </div>

          <div className="footer-section">
            <h4>Security & Legal</h4>
            <Link to="/security">Privacy First Architecture</Link>
            <Link to="/security">Bank-Level 256-Bit SSL</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/contact">Contact Support</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Pace Finance (Pty) Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
