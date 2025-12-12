import {
    ArrowRight,
    BarChart3,
    Calculator,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Quote,
    Shield,
    Target,
    TrendingUp
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/landing.css'

export default function LandingPage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  const testimonials = [
    {
      name: "Thabo Mthembu",
      role: "Software Engineer, Johannesburg",
      image: "👨🏾‍💼",
      quote: "Budgeter helped me pay off R45,000 in debt in just 8 months. The debt snowball feature is a game-changer!"
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
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="container">
          <div className="nav-content">
            <h1 className="logo">Budgeter</h1>
            <div className="nav-links">
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn primary">Get Started Free</Link>
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
                Take Control of Your <span className="gradient-text">Financial Future</span>
              </h1>
              <p className="hero-subtitle">
                The all-in-one platform to track spending, crush debt, and achieve your financial goals. 
                Built for South Africans who want to build wealth.
              </p>
              <div className="hero-cta">
                <Link to="/register" className="btn primary large">
                  Start Free Trial
                  <ArrowRight size={20} />
                </Link>
                <Link to="/login" className="btn secondary large">
                  Sign In
                </Link>
              </div>
              <p className="hero-note">✨ No credit card required • Free forever plan available</p>
            </div>
            <div className="hero-image">
              <div className="dashboard-preview">
                <div className="preview-card">
                  <div className="preview-header">
                    <div className="preview-dot"></div>
                    <div className="preview-dot"></div>
                    <div className="preview-dot"></div>
                  </div>
                  <div className="preview-content">
                    <div className="preview-stat">
                      <TrendingUp className="stat-icon positive" />
                      <div>
                        <p className="stat-label">Net Income</p>
                        <p className="stat-value positive">+R8,000</p>
                      </div>
                    </div>
                    <div className="preview-stat">
                      <Target className="stat-icon" />
                      <div>
                        <p className="stat-label">Savings Goal</p>
                        <p className="stat-value">72% Complete</p>
                      </div>
                    </div>
                    <div className="preview-stat">
                      <DollarSign className="stat-icon negative" />
                      <div>
                        <p className="stat-label">Debt Payoff</p>
                        <p className="stat-value">R15,000 left</p>
                      </div>
                    </div>
                  </div>
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
            <div className="feature-card">
              <div className="feature-icon">
                <BarChart3 size={32} />
              </div>
              <h3>Smart Budget Tracking</h3>
              <p>Set budgets, track spending in real-time, and get alerts before you overspend. See exactly where your money goes.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <DollarSign size={32} />
              </div>
              <h3>Debt Payoff Strategies</h3>
              <p>Use proven Snowball or Avalanche methods to crush debt faster. Calculate payoff timelines and save on interest.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Target size={32} />
              </div>
              <h3>Goal Achievement</h3>
              <p>Set financial goals and track progress automatically. From emergency funds to dream vacations, achieve them all.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Calculator size={32} />
              </div>
              <h3>Tax Optimization</h3>
              <p>Track deductible expenses and maximize tax savings. Built for South African tax laws and regulations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <TrendingUp size={32} />
              </div>
              <h3>Spending Insights</h3>
              <p>AI-powered analytics reveal spending patterns and forecast future expenses. Make smarter financial decisions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={32} />
              </div>
              <h3>Bank-Level Security</h3>
              <p>Your data is encrypted and secure. We never sell your information. Your financial privacy is guaranteed.</p>
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
              <h3>Create Your Account</h3>
              <p>Sign up free in 30 seconds. No credit card required.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Add Your Finances</h3>
              <p>Input your income, expenses, and financial goals.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Watch Your Wealth Grow</h3>
              <p>Get insights, track progress, and achieve your goals.</p>
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
              <h3>Free</h3>
              <div className="price">
                <span className="currency">R</span>
                <span className="amount">0</span>
                <span className="period">/month</span>
              </div>
              <ul className="features-list">
                <li><CheckCircle size={16} /> Basic budget tracking</li>
                <li><CheckCircle size={16} /> Up to 3 categories</li>
                <li><CheckCircle size={16} /> 1 financial goal</li>
                <li><CheckCircle size={16} /> Manual transaction entry</li>
                <li><CheckCircle size={16} /> Basic reports</li>
              </ul>
              <Link to="/register" className="btn secondary full-width">
                Get Started
              </Link>
            </div>

            <div className="pricing-card featured">
              <div className="badge">Most Popular</div>
              <h3>Pro</h3>
              <div className="price">
                <span className="currency">R</span>
                <span className="amount">99</span>
                <span className="period">/month</span>
              </div>
              <ul className="features-list">
                <li><CheckCircle size={16} /> Everything in Free</li>
                <li><CheckCircle size={16} /> Unlimited categories</li>
                <li><CheckCircle size={16} /> Unlimited goals</li>
                <li><CheckCircle size={16} /> Debt payoff calculator</li>
                <li><CheckCircle size={16} /> Tax deduction tracking</li>
                <li><CheckCircle size={16} /> Advanced analytics</li>
                <li><CheckCircle size={16} /> Priority support</li>
              </ul>
              <Link to="/register" className="btn primary full-width">
                Start Free Trial
              </Link>
            </div>

            <div className="pricing-card">
              <h3>Family</h3>
              <div className="price">
                <span className="currency">R</span>
                <span className="amount">199</span>
                <span className="period">/month</span>
              </div>
              <ul className="features-list">
                <li><CheckCircle size={16} /> Everything in Pro</li>
                <li><CheckCircle size={16} /> Up to 5 family members</li>
                <li><CheckCircle size={16} /> Shared budgets & goals</li>
                <li><CheckCircle size={16} /> Parental controls</li>
                <li><CheckCircle size={16} /> Investment tracking</li>
                <li><CheckCircle size={16} /> Financial advisor consultation</li>
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
              <div className="stat-number">10K+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat">
              <div className="stat-number">R50M+</div>
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
            <h2>Loved by Thousands of South Africans</h2>
            <p>See what our users have to say about their financial transformation</p>
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
            <p>Join thousands of South Africans taking control of their money</p>
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
            <div className="footer-section">
              <h3>Budgeter</h3>
              <p>Take control of your financial future</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <Link to="/register">Sign Up</Link>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
              <a href="#privacy">Privacy</a>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <a href="#help">Help Center</a>
              <a href="#faq">FAQ</a>
              <Link to="/login">Login</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Budgeter. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
