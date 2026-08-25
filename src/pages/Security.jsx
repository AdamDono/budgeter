import { CheckCircle, Database, KeyRound, Lock, Server, Shield, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicFooter from '../components/PublicFooter'
import PublicNav from '../components/PublicNav'
import '../styles/legal.css'

export default function Security() {
  return (
    <div className="legal-page">
      <PublicNav />

      {/* Hero Banner */}
      <section className="legal-hero">
        <div className="container">
          <div className="legal-badge">
            <ShieldCheck size={16} />
            <span>Bank-Grade Trust & Reliability</span>
          </div>
          <h1 className="legal-hero-title">Security & Privacy First Architecture</h1>
          <p className="legal-hero-subtitle">
            How Pace Finance protects your financial intelligence with military-grade encryption, zero password retention, and full POPIA compliance.
          </p>
          <div className="legal-hero-meta">
            <span>🛡️ ISO/IEC 27001 Aligned</span>
            <span>🔒 256-Bit SSL/TLS Encryption</span>
            <span>🇿🇦 POPIA Act (No. 4 of 2013) Compliant</span>
          </div>
        </div>
      </section>

      {/* Main Body */}
      <section className="legal-body">
        <div className="container">
          <div className="legal-layout">
            
            {/* Table of Contents Sticky Sidebar */}
            <aside className="legal-sidebar">
              <div className="legal-sidebar-title">Security Overview</div>
              <ul className="legal-toc-list">
                <li><a href="#encryption" className="legal-toc-link">1. Bank-Level Encryption</a></li>
                <li><a href="#credentials" className="legal-toc-link">2. Zero Credential Storage</a></li>
                <li><a href="#popia" className="legal-toc-link">3. POPIA Compliance</a></li>
                <li><a href="#isolation" className="legal-toc-link">4. Data Isolation & Backups</a></li>
                <li><a href="#ai-safety" className="legal-toc-link">5. AI Intelligence Safety</a></li>
                <li><a href="#reporting" className="legal-toc-link">6. Vulnerability Disclosure</a></li>
              </ul>
            </aside>

            {/* Document Content */}
            <main className="legal-content">

              <div className="security-pillars-grid">
                <div className="security-pillar-card">
                  <div className="security-pillar-icon"><Lock size={28} /></div>
                  <h3>256-Bit SSL</h3>
                  <p>All in-transit data uses AES-256 TLS 1.3 protocol encryption.</p>
                </div>
                <div className="security-pillar-card">
                  <div className="security-pillar-icon"><KeyRound size={28} /></div>
                  <h3>Zero Passwords</h3>
                  <p>We never see, log, or store your private banking login credentials.</p>
                </div>
                <div className="security-pillar-card">
                  <div className="security-pillar-icon"><Database size={28} /></div>
                  <h3>No Data Selling</h3>
                  <p>Your financial records are never monetized or shared with third-party lenders.</p>
                </div>
              </div>

              {/* Section 1 */}
              <section id="encryption" className="legal-section">
                <h2><Lock size={22} className="text-emerald-500" /> 1. Bank-Level 256-Bit SSL & Encryption Standards</h2>
                <p>
                  At Pace Finance, safeguarding your financial records is our foundational engineering principle. Every single byte transferred between your browser, our secure API gateways, and our underlying database cluster is encrypted using state-of-the-art <strong>TLS 1.3 encryption with 256-bit Advanced Encryption Standard (AES-256)</strong>.
                </p>
                <p>
                  Data at rest (including your spending records, budget pots, debt balances, and custom targets) is stored inside cryptographic vaults with auto-rotating keys managed by hardware security modules (HSMs).
                </p>
                <div className="legal-card-grid">
                  <div className="legal-callout-card">
                    <h4><Shield size={18} className="text-blue-500" /> Data in Transit</h4>
                    <p>Enforced HTTPS with HSTS preloading, preventing man-in-the-middle interception across all public Wi-Fi and mobile networks.</p>
                  </div>
                  <div className="legal-callout-card">
                    <h4><Server size={18} className="text-emerald-500" /> Data at Rest</h4>
                    <p>Encrypted volume partitions with separated cryptographic salts, guaranteeing complete multi-tenant tenant isolation.</p>
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section id="credentials" className="legal-section">
                <h2><KeyRound size={22} className="text-emerald-500" /> 2. Zero Credential Retention & Tokenized Banking Access</h2>
                <p>
                  Pace Finance operates strictly on a <strong>read-only tokenized integration model</strong>. We never prompt you for, nor do we store, your internet banking passwords, PINs, or secondary multi-factor authentication (MFA) tokens.
                </p>
                <ul>
                  <li><strong>Scoped Read-Only Access:</strong> Pace Finance cannot initiate wire transfers, alter your balances, or debit accounts without explicit manual user action.</li>
                  <li><strong>Session Invalidation:</strong> Authentication sessions use cryptographically signed JWTs with short time-to-live (TTL) expiration policies and automatic revocation.</li>
                  <li><strong>Multi-Factor Authentication (MFA):</strong> Optional biometric and TOTP authenticator app support for seamless login protection.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="popia" className="legal-section">
                <h2><ShieldCheck size={22} className="text-emerald-500" /> 3. South African POPIA Act Compliance</h2>
                <p>
                  As an indigenous South African fintech platform, Pace Finance adheres comprehensively to the <strong>Protection of Personal Information Act, 2013 (Act No. 4 of 2013)</strong> ("POPIA").
                </p>
                <p>
                  Under POPIA, we operate as a Responsible Party, maintaining strict adherence to the 8 statutory conditions for lawful data processing:
                </p>
                <ol>
                  <li><strong>Accountability:</strong> Appointed Information Officer monitoring all security safeguards and compliance audits.</li>
                  <li><strong>Processing Limitation:</strong> Only essential financial data required to compute debt snowballs, budgets, and credit simulations is gathered with your informed consent.</li>
                  <li><strong>Purpose Specification:</strong> Data is strictly utilized to deliver personalized financial intelligence and AI directives.</li>
                  <li><strong>Right to Deletion:</strong> You retain the unconditional right at any time to request complete, permanent erasure of your account and historical records.</li>
                </ol>
              </section>

              {/* Section 4 */}
              <section id="isolation" className="legal-section">
                <h2><Database size={22} className="text-emerald-500" /> 4. Data Isolation & Redundant Backup Architecture</h2>
                <p>
                  Our server architecture is hosted within top-tier ISO-27001 certified data center regions. Database instances feature automatic real-time replication with hourly snapshot backups across geographically separated availability zones.
                </p>
                <p>
                  In the rare event of a hardware disruption, our disaster recovery (DR) protocols ensure point-in-time recovery with near-zero data loss (RPO &lt; 5 minutes, RTO &lt; 15 minutes).
                </p>
              </section>

              {/* Section 5 */}
              <section id="ai-safety" className="legal-section">
                <h2><CheckCircle size={22} className="text-emerald-500" /> 5. AI Financial Strategy & Privacy Sandboxing</h2>
                <p>
                  Pace AI Coach operates inside a closed, private inference pipeline. Your identifiable financial numbers are tokenized and anonymized before algorithmic synthesis.
                </p>
                <p>
                  <strong>Crucial Commitment:</strong> Your private financial transactions and chat history are <em>never</em> used to train public third-party foundation models.
                </p>
              </section>

              {/* Section 6 */}
              <section id="reporting" className="legal-section">
                <h2><Shield size={22} className="text-emerald-500" /> 6. Responsible Vulnerability Disclosure</h2>
                <p>
                  We actively welcome responsible disclosures from ethical security researchers. If you identify a potential security vulnerability within our platform, please report it immediately to our security response team at <a href="mailto:security@pacefinances.co.za" className="text-blue-600 font-semibold">security@pacefinances.co.za</a>.
                </p>
                <div style={{ marginTop: '2rem' }}>
                  <Link to="/contact" className="contact-submit-btn" style={{ textDecoration: 'none' }}>
                    Contact Security Team
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
