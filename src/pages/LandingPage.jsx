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
      quote: "The tax deduction tracker saved me R8,000 on my tax return. This app pays for itself!"
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
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Master your <span>Rand.</span><br />
                Retire your Debt.<br />
                <span><span className="hero-accent">Experience</span> Financial <span className="hero-accent">Peace.</span></span>
              </h1>
              <p className="hero-subtitle">
                Pace Finance is the AI-driven wealth-builder that turns every Rand into a mission. 
                Beyond simple tracking, we provide the strategic intelligence you need to retire your debt and master your financial journey.
              </p>
              <div className="hero-cta">
                <Link to="/register" className="btn primary large pulse-btn">
                  Start Your Journey
                  <ArrowRight size={20} />
                </Link>
                <Link to="/login" className="btn glass large">
                  Sign In
                </Link>
              </div>
              <div className="trust-badges">
                <div className="badge-item">
                  <Shield size={16} className="text-emerald-400" />
                  <span>No Bank Passwords Required</span>
                </div>
              </div>
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

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2>Everything You Need to Master Your Money</h2>
            <p>Powerful features designed for real financial transformation</p>
          </div>
          <div className="features-grid">
            <div className="feature-card glass">
              <div className="feature-icon">
                <Crosshair size={32} />
              </div>
              <h3>Tactical Debt Eradication</h3>
              <p>Deploy Snowball or Avalanche methods to algorithmically crush your loans. We calculate your exact timeline and the interest you'll save.</p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">
                <Activity size={32} />
              </div>
              <h3>Actionable Credit Hub</h3>
              <p>Don't just watch your score—manipulate it. Our advanced simulator shows you exactly how paying down an account impacts your credit profile.</p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">
                <Wallet size={32} />
              </div>
              <h3>Autonomous Cashflow</h3>
              <p>Allocate every Rand with precision. Set up dynamic "pots" that intelligently fund your long-term goals and protect your emergency reserves.</p>
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
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Establish Your Baseline</h3>
              <p>Input your income, fixed expenses, and debt. Our engine calculates your true disposable Rand instantly.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Deploy the Strategy</h3>
              <p>Activate your debt snowball or avalanche. Let Pace blueprint your fastest, mathematically proven path to freedom.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
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
                <li><CheckCircle size={16} /> Tax Deduction Discovery (S11F)</li>
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

      {/* Social Proof */}
      <section className="social-proof">
        <div className="container">
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-number">1k+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat">
              <div className="stat-number">R200k+</div>
              <div className="stat-label">Debt Paid Off</div>
            </div>
            <div className="stat">
              <div className="stat-number">4.9/5</div>
              <div className="stat-label">User Rating</div>
            </div>
            <div className="stat">
              <div className="stat-number">95%</div>
              <div className="stat-label">Goal Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2>Loved by People Who Take Money Seriously</h2>
            <p>Real users. Real results. Real financial freedom.</p>
          </div>
          
          <div className="testimonial-carousel">
            <button className="carousel-btn prev" onClick={prevTestimonial}>
              <ChevronLeft size={24} />
            </button>
            
            <div className="testimonial-card">
              <Quote className="quote-icon" size={48} />
              <p className="testimonial-quote">"{testimonials[currentTestimonial].quote}"</p>
              <div className="testimonial-author">
                <div className="author-image">{testimonials[currentTestimonial].image}</div>
                <div className="author-info">
                  <p className="author-name">{testimonials[currentTestimonial].name}</p>
                  <p className="author-role">{testimonials[currentTestimonial].role}</p>
                </div>
              </div>
            </div>
            
            <button className="carousel-btn next" onClick={nextTestimonial}>
              <ChevronRight size={24} />
            </button>
          </div>
          
          <div className="carousel-dots">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentTestimonial ? 'active' : ''}`}
                onClick={() => setCurrentTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Finances?</h2>
            <Link to="/register" className="btn primary large">
              Start Your Free Trial
              <ArrowRight size={20} />
            </Link>
            <p className="cta-note">No credit card required • Cancel anytime</p>
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
              <p className="footer-tagline">Your AI-powered financial strategist.<br/>Built for the ambitious.</p>
              <div className="footer-social">
                <a href="#" className="social-link" aria-label="X (Twitter)"><Twitter size={18} /></a>
                <a href="#" className="social-link" aria-label="LinkedIn"><Linkedin size={18} /></a>
                <a href="#" className="social-link" aria-label="Facebook"><Facebook size={18} /></a>
                <a href="#" className="social-link" aria-label="TikTok"><Video size={18} /></a>
              </div>
            </div>
            <div className="footer-section">
              <h4>Platform</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <Link to="/register">Get Started</Link>
              <Link to="/login">Sign In</Link>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <a href="#about">About Pace</a>
              <a href="#contact">Contact Us</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Use</a>
            </div>
            <div className="footer-section">
              <h4>Tools</h4>
              <a href="#debt">Debt Calculator</a>
              <a href="#credit">Credit Simulator</a>
              <a href="#faq">FAQ</a>
              <Link to="/login">Help Center</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Pace Finance. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
