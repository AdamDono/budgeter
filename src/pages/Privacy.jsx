import { Database, Eye, Lock, ShieldCheck, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicFooter from '../components/PublicFooter'
import PublicNav from '../components/PublicNav'
import '../styles/legal.css'

export default function Privacy() {
  return (
    <div className="legal-page">
      <PublicNav />

      {/* Hero Banner */}
      <section className="legal-hero">
        <div className="container">
          <div className="legal-badge">
            <ShieldCheck size={16} />
            <span>POPIA & Privacy Policy</span>
          </div>
          <h1 className="legal-hero-title">Privacy Policy</h1>
          <p className="legal-hero-subtitle">
            Our strict commitment to protecting your personal financial information. We never sell your data, monetize your records, or compromise your privacy.
          </p>
          <div className="legal-hero-meta">
            <span>🛡️ POPIA Act (Act 4 of 2013) Compliant</span>
            <span>📅 Last Updated: January 2026</span>
            <span>🔐 Zero Third-Party Data Monetization</span>
          </div>
        </div>
      </section>

      {/* Main Body */}
      <section className="legal-body">
        <div className="container">
          <div className="legal-layout">
            
            {/* Table of Contents Sticky Sidebar */}
            <aside className="legal-sidebar">
              <div className="legal-sidebar-title">Privacy Sections</div>
              <ul className="legal-toc-list">
                <li><a href="#collection" className="legal-toc-link">1. Information We Collect</a></li>
                <li><a href="#usage" className="legal-toc-link">2. How We Use Your Data</a></li>
                <li><a href="#no-selling" className="legal-toc-link">3. Strict No-Data-Selling Policy</a></li>
                <li><a href="#retention" className="legal-toc-link">4. Data Retention & Erasure</a></li>
                <li><a href="#rights" className="legal-toc-link">5. Your POPIA Subject Rights</a></li>
                <li><a href="#cookies" className="legal-toc-link">6. Cookies & Local Storage</a></li>
                <li><a href="#contact-dpo" className="legal-toc-link">7. Contact Information Officer</a></li>
              </ul>
            </aside>

            {/* Document Content */}
            <main className="legal-content">

              {/* Section 1 */}
              <section id="collection" className="legal-section">
                <h2><Database size={22} className="text-blue-500" /> 1. Information We Collect</h2>
                <p>
                  To provide you with accurate debt payoff schedules, cash flow analytics, and budgeting calculations, Pace Finance collects the following categories of information:
                </p>
                <ul>
                  <li><strong>Account Registration Data:</strong> Your name, email address, password hash (salted via bcrypt with high work factors), and optional profile display details.</li>
                  <li><strong>Self-Reported Financial Figures:</strong> Net monthly income, fixed recurring bills, expense categories, credit balances, interest rates, and financial goals.</li>
                  <li><strong>Usage & Telemetry:</strong> Anonymized interaction metrics to diagnose technical errors and improve user experience performance.</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section id="usage" className="legal-section">
                <h2><Eye size={22} className="text-blue-500" /> 2. How We Use Your Information</h2>
                <p>
                  We process personal information strictly to fulfill our core software functions:
                </p>
                <ul>
                  <li>Calculating optimal debt snowball and avalanche repayment schedules.</li>
                  <li>Providing real-time credit profile simulations and cash flow projections.</li>
                  <li>Powering your private Pace AI Coach interactions for tailored behavioral guidance.</li>
                  <li>Sending critical account notifications (e.g., security alerts, billing invoices).</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="no-selling" className="legal-section">
                <h2><Lock size={22} className="text-emerald-500" /> 3. Our Unconditional No-Data-Selling Guarantee</h2>
                <div className="legal-callout-card" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                  <h4 style={{ color: '#166534' }}>🛡️ You Are Not The Product</h4>
                  <p style={{ color: '#15803d' }}>
                    Pace Finance does not sell, rent, license, or broker your personal financial records to advertising networks, insurance underwriters, lending brokerages, or credit bureaus. Our business model relies purely on transparent user software subscriptions.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section id="retention" className="legal-section">
                <h2><Database size={22} className="text-blue-500" /> 4. Data Storage, Security & Retention</h2>
                <p>
                  All data is encrypted in transit via TLS 1.3 and at rest with AES-256 cryptographic keys. We retain your financial information only for as long as your account remains active.
                </p>
                <p>
                  If you choose to delete your account, our automated purging routines immediately erase your personal database records and cryptographic keys, rendering historical backup logs irreversibly unreadable.
                </p>
              </section>

              {/* Section 5 */}
              <section id="rights" className="legal-section">
                <h2><UserCheck size={22} className="text-blue-500" /> 5. Your South African POPIA Data Subject Rights</h2>
                <p>
                  Under Section 5 of the Protection of Personal Information Act, you hold the following statutory rights regarding your personal information:
                </p>
                <ul>
                  <li><strong>Right to Access:</strong> You may request a complete export of all personal data held about you by Pace Finance.</li>
                  <li><strong>Right to Rectification:</strong> You may correct or update any inaccurate or outdated information directly within your user settings.</li>
                  <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> You may request the permanent destruction of your personal data record at any time.</li>
                  <li><strong>Right to Object:</strong> You may object at any time to the processing of your personal data on reasonable statutory grounds.</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="cookies" className="legal-section">
                <h2><Lock size={22} className="text-blue-500" /> 6. Cookies & Local Storage</h2>
                <p>
                  We utilize secure, HTTP-only authentication tokens and essential session storage items necessary to keep you securely signed in across app navigations. We do not employ third-party tracking pixels or cross-site tracking cookies.
                </p>
              </section>

              {/* Section 7 */}
              <section id="contact-dpo" className="legal-section">
                <h2><ShieldCheck size={22} className="text-blue-500" /> 7. Contact Our Information Officer</h2>
                <p>
                  For any privacy inquiries, data subject access requests (DSARs), or POPIA compliance questions, contact our appointed Information Officer:
                </p>
                <div className="legal-callout-card">
                  <h4>Information Officer: Pace Finance (Pty) Ltd</h4>
                  <p><strong>Email:</strong> <a href="mailto:privacy@pacefinances.co.za" className="text-blue-600">privacy@pacefinances.co.za</a></p>
                  <p><strong>Physical Address:</strong> Johannesburg, Gauteng, South Africa</p>
                </div>
                <div style={{ marginTop: '2rem' }}>
                  <Link to="/contact" className="contact-submit-btn" style={{ textDecoration: 'none' }}>
                    Submit Privacy Request
                  </Link>
                </div>
              </section>

            </main>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
