import { FileText, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicFooter from '../components/PublicFooter'
import PublicNav from '../components/PublicNav'
import '../styles/legal.css'

export default function Terms() {
  return (
    <div className="legal-page">
      <PublicNav />

      {/* Hero Banner */}
      <section className="legal-hero">
        <div className="container">
          <div className="legal-badge">
            <Scale size={16} />
            <span>Legal Framework</span>
          </div>
          <h1 className="legal-hero-title">Terms of Service</h1>
          <p className="legal-hero-subtitle">
            Please review the terms and conditions that govern your use of the Pace Finance platform, AI coaching directives, and financial calculation tools.
          </p>
          <div className="legal-hero-meta">
            <span>📅 Effective Date: 1 January 2026</span>
            <span>📍 Jurisdiction: Republic of South Africa</span>
            <span>⚖️ Consumer Protection Act (CPA) Aligned</span>
          </div>
        </div>
      </section>

      {/* Main Body */}
      <section className="legal-body">
        <div className="container">
          <div className="legal-layout">
            
            {/* Table of Contents Sticky Sidebar */}
            <aside className="legal-sidebar">
              <div className="legal-sidebar-title">Table of Contents</div>
              <ul className="legal-toc-list">
                <li><a href="#acceptance" className="legal-toc-link">1. Acceptance of Terms</a></li>
                <li><a href="#eligibility" className="legal-toc-link">2. Eligibility & Accounts</a></li>
                <li><a href="#nature-of-service" className="legal-toc-link">3. Nature of Service & Disclaimer</a></li>
                <li><a href="#ai-coach" className="legal-toc-link">4. AI Strategic Directives</a></li>
                <li><a href="#subscriptions" className="legal-toc-link">5. Subscriptions & Payments</a></li>
                <li><a href="#ip" className="legal-toc-link">6. Intellectual Property</a></li>
                <li><a href="#termination" className="legal-toc-link">7. Cancellation & Termination</a></li>
                <li><a href="#governing-law" className="legal-toc-link">8. Governing Law & Dispute Resolution</a></li>
              </ul>
            </aside>

            {/* Document Content */}
            <main className="legal-content">

              {/* Section 1 */}
              <section id="acceptance" className="legal-section">
                <h2><FileText size={22} className="text-blue-500" /> 1. Acceptance of Terms</h2>
                <p>
                  By accessing, browsing, registering for, or using the Pace Finance web application, mobile interfaces, or API integrations (collectively, the <strong>"Platform"</strong>), you acknowledge that you have read, understood, and agree to be legally bound by these Terms of Service (<strong>"Terms"</strong>) and our accompanying <Link to="/privacy" className="text-blue-600 font-semibold">Privacy Policy</Link>.
                </p>
                <p>
                  If you do not agree to these Terms in their entirety, you must immediately discontinue your access to and usage of the Platform.
                </p>
              </section>

              {/* Section 2 */}
              <section id="eligibility" className="legal-section">
                <h2><Scale size={22} className="text-blue-500" /> 2. Eligibility & User Account Responsibilities</h2>
                <p>
                  To create an account and access Pace Finance services, you represent and warrant that:
                </p>
                <ul>
                  <li>You are at least 18 years of age or possess the legal contractual capacity under South African law.</li>
                  <li>All information you submit during registration is accurate, current, and complete.</li>
                  <li>You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your registered account.</li>
                  <li>You will notify Pace Finance immediately upon suspecting any unauthorized access to your account.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="nature-of-service" className="legal-section">
                <h2><FileText size={22} className="text-blue-500" /> 3. Nature of Service & Financial Disclaimer</h2>
                <p>
                  <strong>Important Notice:</strong> Pace Finance is an algorithmic budgeting software, debt eradication simulation engine, and personal financial management platform. Pace Finance (Pty) Ltd is <strong>not</strong> a registered Financial Services Provider (FSP) under the Financial Advisory and Intermediary Services Act, 2002 (FAIS Act).
                </p>
                <div className="legal-callout-card" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
                  <h4 style={{ color: '#b45309' }}>⚠️ Informational and Planning Tool Only</h4>
                  <p style={{ color: '#92400e' }}>
                    Calculations, debt payoff timelines, S11F tax projections, and savings forecasts generated by Pace Finance are mathematical simulations for budgeting purposes only. They do not constitute formal financial, investment, legal, or tax advice. For personalized advisory, consult a certified independent Financial Planner.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section id="ai-coach" className="legal-section">
                <h2><FileText size={22} className="text-blue-500" /> 4. AI Strategic Directives & Coaching Use</h2>
                <p>
                  The Pace AI Coach provides automated behavioral insights and spending directives based on data you enter or sync. While our models are calibrated against South African interest rates and tax benchmarks, you retain ultimate discretion and responsibility over any financial decisions, purchases, loan payoffs, or investments you execute.
                </p>
              </section>

              {/* Section 5 */}
              <section id="subscriptions" className="legal-section">
                <h2><Scale size={22} className="text-blue-500" /> 5. Subscriptions, Fees & Billing</h2>
                <p>
                  Certain premium capabilities (including Pace Pro and Wealth tiers) are made available through monthly or annual subscription plans. All prices are quoted in South African Rand (ZAR) and are inclusive of Value-Added Tax (VAT) where applicable.
                </p>
                <ul>
                  <li><strong>Free Trial:</strong> New subscribers may be granted trial access. You may cancel at any point prior to trial conclusion without being billed.</li>
                  <li><strong>Automatic Renewal:</strong> Paid subscriptions automatically renew on your monthly billing date unless canceled prior to the renewal cycle.</li>
                  <li><strong>Payment Processors:</strong> Payments are processed via PCI-DSS Level 1 compliant payment gateways (such as Paystack, Stitch, or Stripe). We never store your full payment card digits.</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="ip" className="legal-section">
                <h2><FileText size={22} className="text-blue-500" /> 6. Intellectual Property Rights</h2>
                <p>
                  All software code, mathematical models, UI designs, brand logos, graphical assets, and algorithms contained on the Platform are the exclusive intellectual property of Pace Finance (Pty) Ltd. You are granted a revocable, non-exclusive, non-transferable personal license to use the software solely for personal wealth management.
                </p>
              </section>

              {/* Section 7 */}
              <section id="termination" className="legal-section">
                <h2><Scale size={22} className="text-blue-500" /> 7. Account Cancellation & Data Erasure</h2>
                <p>
                  You may cancel your account at any time through your Profile Settings. Upon account termination, your subscription billing will cease immediately, and all associated personal financial data can be permanently deleted upon request in accordance with our POPIA deletion procedures.
                </p>
              </section>

              {/* Section 8 */}
              <section id="governing-law" className="legal-section">
                <h2><FileText size={22} className="text-blue-500" /> 8. Governing Law & Jurisdiction</h2>
                <p>
                  These Terms are governed by and construed in accordance with the substantive laws of the <strong>Republic of South Africa</strong>. Any disputes arising out of or in connection with these Terms shall be subject to the non-exclusive jurisdiction of the High Court of South Africa (Western Cape Division, Cape Town).
                </p>
                <div style={{ marginTop: '2.5rem' }}>
                  <p>Have questions regarding our Terms? Contact our legal compliance desk:</p>
                  <Link to="/contact" className="contact-submit-btn" style={{ textDecoration: 'none' }}>
                    Contact Legal Support
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
