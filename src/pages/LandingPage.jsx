import {
  Activity,
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Facebook,
  Linkedin,
  Moon,
  Quote,
  Shield,
  Sun,
  Twitter,
  Video,
  Wallet
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/landing.css'

export default function LandingPage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [theme, setTheme] = useState('dark')

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const testimonials = [
    {
      name: "Thabo Mthembu",
      role: "Software Engineer, Johannesburg",
      image: "👨🏾‍💼",
      quote: "Pace Finance helped me pay off R45,000 in debt in just 8 months. The debt snowball feature is a game-changer!"
    },
    {
      name: "Sarah van der Merwe",
      role: "Teacher, Cape Town",
      image: "👩🏼‍🏫",
      quote: "I finally understand where my money goes each month. Saved R12,000 for my dream vacation in 6 months!"
    },
    {
      name: "Lindiwe Ndlovu",
      role: "Entrepreneur, Durban",
      image: "👩🏿‍💼",
      quote: "The AI Coach helped me identify R8,000 in unnecessary monthly spending. This app pays for itself!"
    },
    {
      name: "Michael Chen",
      role: "Accountant, Pretoria",
      image: "👨🏻‍💼",
      quote: "Best budgeting app I've used. Clean interface, powerful features, and actually helps me save money."
    }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000) // Change every 5 seconds

    return () => clearInterval(timer)
  }, [testimonials.length])

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <div className={`landing-page ${theme === 'light' ? 'light-mode' : ''}`}>
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="container">
          <div className="nav-content">
            <div className="logo-container">
              <Link to="/" className="logo-link">
                <img src="/logo_pace_finance.svg" alt="Pace Finance" className="logo-image-metallic" />
              </Link>
            </div>
            <div className="nav-links">
              <button 
                onClick={toggleTheme} 
                className="theme-toggle-btn"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <Link to="/register" className="btn primary nav-cta">Get Started Free</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero full-screen-hero">
        <div className="hero-fullscreen-inner">
          <div className="container hero-container-fullscreen">
            <div className="hero-banner-content">
              <h1 className="hero-banner-title">
                Master your <span>Rand.</span><br />
                Retire your Debt.
              </h1>
              <p className="hero-banner-subtitle">
                Pace Finance is the AI-driven wealth-builder that turns every Rand into a mission.
              </p>
              <div className="hero-banner-cta">
                <Link to="/register" className="hero-btn-dark">
                  Start Your Journey
                  <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                </Link>
                <Link to="/login" className="hero-btn-light">
                  Sign In
                </Link>
              </div>
              <div className="hero-banner-trust">
                <Shield size={18} className="text-emerald-400" />
                <span>No Bank Passwords Required</span>
              </div>
            </div>

            <div className="hero-banner-image-wrap">
              <img 
                src="/hero_man.png" 
                alt="Take Control of Your Money" 
                className="hero-banner-man"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Intro Header */}
      <section className="services-intro">
        <div className="container">
          <div className="services-intro-grid">
            <div className="services-intro-left">
              <p className="services-tagline">Pace Finance is the smart way to manage your wealth.</p>
            </div>
            <div className="services-intro-right">
              <h2 className="services-intro-title">Built Around You. Smart, Secure, and Effortless.</h2>
              <p className="services-intro-subtitle">AI-powered tools designed for real South African financial transformation, all in one place.</p>
              <a href="#services-cards" className="services-view-btn">View All Services</a>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Column Service Cards */}
      <section className="services-cards" id="services-cards">
        <div className="container">
          <div className="services-grid">

            {/* Card 1: Debt Tracker — Photo Background */}
            <div className="service-card service-card-photo">
              <div className="service-card-overlay">
                <div className="service-card-emoji">⚔️</div>
                <h3>Tactical Debt Eradication</h3>
                <p>Deploy Snowball or Avalanche methods to crush your loans. We calculate your exact timeline and interest saved.</p>
                <Link to="/register" className="service-card-btn">Get Started</Link>
              </div>
            </div>

            {/* Card 2: Credit Hub — Lavender */}
            <div className="service-card service-card-lavender">
              <div className="service-card-icon">📊</div>
              <h3>Actionable Credit Hub</h3>
              <p>Don't just watch your score. Manipulate it. See exactly how paying down an account impacts your credit profile.</p>
            </div>

            {/* Card 3: Cashflow — Yellow-Green */}
            <div className="service-card service-card-lime">
              <div className="service-card-icon">💰</div>
              <h3>Autonomous Cashflow</h3>
              <p>Allocate every Rand with precision. Dynamic "pots" that intelligently fund your goals and protect your emergency reserves.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Secret Sauce AI Section */}
      <section className="ai-reveal-section">
        <div className="container">
          <div className="ai-grid">
            <div className="ai-visual">
               <div className="coach-mockup">
                  <div className="chat-header">
                    <div className="bot-status"></div>
                    <span>Pace AI Coach</span>
                  </div>
                  <div className="chat-body">
                    <div className="chat-msg assistant">
                      <p>I analyzed your spending at Woolworths. You're R800 over your grocery budget. Want me to move R800 from your 'Fun Money' pot to cover it? 🇿🇦</p>
                    </div>
                    <div className="chat-msg user">
                      <p>Yes, do it. Also, how is my debt snowball looking?</p>
                    </div>
                    <div className="chat-msg assistant">
                      <p>Excellent. Snowball updated! You're now on track to be 100% debt-free by **December 2026**. That's 4 months faster than last week! 🚀</p>
                    </div>
                  </div>
               </div>
            </div>
            <div className="ai-text">
               <div className="section-label">THE SECRET SAUCE</div>
               <h2>Meet the Coach that Never Sleeps</h2>
               <p>Traditional finance apps show you where your money <em>went</em>. Pace shows you where it's <em>going</em>.</p>
               <ul className="ai-features">
                 <li>
                   <div className="ai-feat-icon">🎯</div>
                   <div className="ai-feat-text">
                     <h4>Proactive Directives</h4>
                     <p>Our AI doesn't just show charts; it gives instructions. "Pay this," "Save that," "Wait on this purchase."</p>
                   </div>
                 </li>
                 <li>
                   <div className="ai-feat-icon">🇿🇦</div>
                   <div className="ai-feat-text">
                     <h4>Local Market Intelligence</h4>
                     <p>Deep understanding of SA interest rates, tax laws (S11F!), and local banking behavior.</p>
                   </div>
                 </li>
                 <li>
                   <div className="ai-feat-icon">⚡</div>
                   <div className="ai-feat-text">
                     <h4>Real-Time Simulation</h4>
                     <p>Instantly see how a single R500 purchase affects your retirement at age 65.</p>
                   </div>
                 </li>
               </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Lifestyle Feature Section */}
      <section className="lifestyle-feature-section">
        <div className="container">
          <div className="lifestyle-intro-centered">
            <h2 className="lifestyle-intro-title">
              Build Wealth. Eradicate Debt.<br />
              Everything you need for financial independence.
            </h2>
          </div>

          <div className="lifestyle-image-card">
            <img 
              src="/lifestyle_friends.jpg" 
              alt="South African friends managing their finances together" 
              className="lifestyle-banner-img"
            />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="security-section">
        <div className="container">
          <div className="security-container glass">
             <div className="security-icon-main">
                <Shield size={64} className="text-emerald-400" />
             </div>
             <div className="security-content">
                <h2>Built Like a Fortress. Shared with No One.</h2>
                <p>We believe your financial data is sacred. We built Pace with a "Privacy First" architecture specifically for the financial landscape.</p>
                <div className="security-grid">
                   <div className="sec-item">
                      <h4>Bank-Level SSL</h4>
                      <p>Military-grade 256-bit encryption protecting every single byte of your data.</p>
                   </div>
                   <div className="sec-item">
                      <h4>Zero Password Storage</h4>
                      <p>We use secure API tokens. We never see or store your bank login credentials.</p>
                   </div>
                   <div className="sec-item">
                      <h4>No Data Selling</h4>
                      <p>Your data is not a product. We never sell your info to insurance companies or lenders.</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>Get Started in 3 Simple Steps</h2>
            <p>From signup to financial clarity in minutes</p>
          </div>

          <div className="steps-cards-grid">
            {/* Card 1: Photo Background */}
            <div className="step-card step-card-photo">
              <div className="step-card-overlay">
                <div className="step-badge-num photo-num">01</div>
                <h3>Establish Your Baseline</h3>
                <p>Input your income, fixed expenses, and debt. Our engine calculates your true disposable Rand instantly.</p>
                <Link to="/register" className="step-card-btn">Get Started</Link>
              </div>
            </div>

            {/* Card 2: Lavender Card */}
            <div className="step-card step-card-lavender">
              <div className="step-badge-num lavender-num">02</div>
              <h3>Deploy the Strategy</h3>
              <p>Activate your debt snowball or avalanche. Let Pace blueprint your fastest, mathematically proven path to freedom.</p>
            </div>

            {/* Card 3: Lime Card */}
            <div className="step-card step-card-lime">
              <div className="step-badge-num lime-num">03</div>
              <h3>Engage the AI</h3>
              <p>Consult your personal 24/7 financial strategist for insights, course corrections, and growth tactics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing">
        <div className="container">
          <div className="section-header">
            <h2>Choose Your Plan</h2>
            <p>Start free, upgrade when you're ready</p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Starter</h3>
              <div className="price">
                <span className="currency">R</span>
                <span className="amount">0</span>
                <span className="period">/month</span>
              </div>
              <ul className="features-list">
                <li><CheckCircle size={16} /> Standard Dashboard</li>
                <li><CheckCircle size={16} /> 1 Active Debt Plan</li>
                <li><CheckCircle size={16} /> Limited AI Queries (10/mo)</li>
                <li><CheckCircle size={16} /> Basic Credit Monitoring</li>
              </ul>
              <Link to="/register" className="btn secondary full-width">
                Get Started
              </Link>
            </div>

            <div className="pricing-card featured">
              <div className="badge">Most Popular</div>
              <h3>Pace Pro</h3>
              <div className="price">
                <span className="currency">R</span>
                <span className="amount">49</span>
                <span className="period">/month</span>
              </div>
              <ul className="features-list">
                <li><CheckCircle size={16} /> Everything in Starter</li>
                <li><CheckCircle size={16} /> Unlimited AI Consultations</li>
                <li><CheckCircle size={16} /> Advanced Credit Simulator</li>
                <li><CheckCircle size={16} /> Auto-Pilot Debt Eradication</li>
                <li><CheckCircle size={16} /> Advanced Cash Flow Projections</li>
                <li><CheckCircle size={16} /> Priority Support</li>
              </ul>
              <Link to="/register" className="btn primary full-width">
                Start Free Trial
              </Link>
            </div>

            <div className="pricing-card">
              <h3>Wealth</h3>
              <div className="price">
                <span className="currency">R</span>
                <span className="amount">149</span>
                <span className="period">/month</span>
              </div>
              <ul className="features-list">
                <li><CheckCircle size={16} /> Everything in Pro</li>
                <li><CheckCircle size={16} /> Live Human Advisor Access</li>
                <li><CheckCircle size={16} /> Joint/Family Accounts</li>
                <li><CheckCircle size={16} /> Investment & Market Tracking</li>
                <li><CheckCircle size={16} /> Custom Legal & Tax Prep</li>
              </ul>
              <Link to="/register" className="btn secondary full-width">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="container">
          <div className="final-cta-banner">
            <div className="final-cta-content">
              <h2 className="final-cta-title">
                Ready to Transform<br />
                Your Finances?
              </h2>
              <p className="final-cta-subtitle">
                Join thousands of South Africans building wealth, crushing debt, and mastering their Rand.
              </p>
              <div className="final-cta-actions">
                <Link to="/register" className="hero-btn-dark">
                  Start Your Free Trial
                  <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                </Link>
              </div>
              <p className="final-cta-note">
                <Shield size={16} className="text-emerald-400" />
                <span>No credit card required • Cancel anytime</span>
              </p>
            </div>

            <div className="final-cta-image-wrap">
              <img 
                src="/woman_transparent.png" 
                alt="Ready to Transform Your Finances" 
                className="final-cta-woman"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
              <div className="footer-sa-badge">
                <span className="sa-flag">🇿🇦</span>
                <span>Proudly Built in South Africa</span>
              </div>
              <div className="footer-social">
                <a href="#" className="social-link" aria-label="X (Twitter)"><Twitter size={18} /></a>
                <a href="#" className="social-link" aria-label="LinkedIn"><Linkedin size={18} /></a>
                <a href="#" className="social-link" aria-label="Facebook"><Facebook size={18} /></a>
                <a href="#" className="social-link" aria-label="TikTok"><Video size={18} /></a>
              </div>
            </div>

            <div className="footer-section">
              <h4>Platform</h4>
              <a href="#services-cards">Tactical Debt Tracker</a>
              <a href="#services-cards">Actionable Credit Hub</a>
              <a href="#services-cards">Autonomous Cashflow</a>
              <a href="#ai-coach">24/7 AI Coach</a>
              <Link to="/register">Get Started</Link>
            </div>

            <div className="footer-section">
              <h4>Calculators & Tools</h4>
              <a href="#services-cards">Debt Snowball Engine</a>
              <a href="#services-cards">Interest Saved Tracker</a>
              <a href="#services-cards">Credit Score Simulator</a>
              <Link to="/login">Client Portal</Link>
              <Link to="/login">Help Center</Link>
            </div>

            <div className="footer-section">
              <h4>Security & Legal</h4>
              <a href="#security">Privacy First Architecture</a>
              <a href="#security">Bank-Level 256-Bit SSL</a>
              <a href="#terms">Terms of Service</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#contact">Contact Support</a>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-bottom-left">
              <p>© 2026 Pace Finance (Pty) Ltd. All rights reserved.</p>
            </div>
            <div className="footer-bottom-right">
              <div className="footer-status-pill">
                <span className="status-dot"></span>
                <span>All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
