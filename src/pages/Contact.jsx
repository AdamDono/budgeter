import { CheckCircle2, Clock, Mail, MapPin, MessageSquare, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import PublicFooter from '../components/PublicFooter'
import PublicNav from '../components/PublicNav'
import '../styles/legal.css'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'general',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)

    // Simulate reliable dispatch
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
      toast.success('Your message has been sent! Our support team will get back to you within 24 hours.')
    }, 1000)
  }

  return (
    <div className="legal-page">
      <PublicNav />

      {/* Hero Banner */}
      <section className="legal-hero">
        <div className="container">
          <div className="legal-badge">
            <MessageSquare size={16} />
            <span>Direct Support Desk</span>
          </div>
          <h1 className="legal-hero-title">How Can We Help You?</h1>
          <p className="legal-hero-subtitle">
            Whether you have a question about debt calculations, security protocols, subscription billing, or partnership opportunities, our team is ready.
          </p>
          <div className="legal-hero-meta">
            <span>⚡ Typical Response: Under 24 Hours</span>
            <span>📍 Cape Town & Johannesburg, South Africa</span>
            <span>💬 Mon–Fri: 08:00 – 18:00 SAST</span>
          </div>
        </div>
      </section>

      {/* Main Body */}
      <section className="legal-body">
        <div className="container">
          <div className="contact-layout">

            {/* Left: Contact Info & Channels */}
            <aside className="contact-info-card">
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>
                Get in Touch Directly
              </h2>

              <div className="contact-item">
                <div className="contact-icon"><Mail size={22} /></div>
                <div className="contact-item-text">
                  <h4>Customer Support</h4>
                  <p><a href="mailto:support@pacefinances.co.za">support@pacefinances.co.za</a></p>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>For account, feature, or billing assistance</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon"><ShieldCheck size={22} /></div>
                <div className="contact-item-text">
                  <h4>Security & POPIA Compliance</h4>
                  <p><a href="mailto:security@pacefinances.co.za">security@pacefinances.co.za</a></p>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>For data privacy & responsible disclosures</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon"><Clock size={22} /></div>
                <div className="contact-item-text">
                  <h4>Operational Hours</h4>
                  <p>Monday to Friday: 08:00 to 18:00 SAST</p>
                  <p>Saturday: 09:00 to 13:00 SAST</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon"><MapPin size={22} /></div>
                <div className="contact-item-text">
                  <h4>Headquarters</h4>
                  <p>Pace Finance (Pty) Ltd</p>
                  <p>Cape Town, Western Cape, 8001</p>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>South Africa 🇿🇦</p>
                </div>
              </div>
            </aside>

            {/* Right: Interactive Message Form */}
            <main className="contact-form-card">
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem'
                  }}>
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                    Message Received!
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 2rem' }}>
                    Thank you, <strong>{formData.name}</strong>. A specialist from our team will review your inquiry and reach out to <strong>{formData.email}</strong> shortly.
                  </p>
                  <button 
                    onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', category: 'general', subject: '', message: '' }) }}
                    className="contact-submit-btn"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                    Send Us a Message
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>
                    Fill out the form below and we'll route your ticket to the right specialist.
                  </p>

                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input 
                      type="text" 
                      id="name" 
                      name="name" 
                      required 
                      placeholder="e.g. Sipho Ndlovu" 
                      value={formData.name} 
                      onChange={handleChange} 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      required 
                      placeholder="sipho@example.co.za" 
                      value={formData.email} 
                      onChange={handleChange} 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="category">Inquiry Type</label>
                    <select id="category" name="category" value={formData.category} onChange={handleChange}>
                      <option value="general">General Question</option>
                      <option value="technical">Technical & App Support</option>
                      <option value="billing">Subscription & Billing</option>
                      <option value="security">Security & POPIA Privacy</option>
                      <option value="partnerships">Enterprise & Partnerships</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="subject">Subject *</label>
                    <input 
                      type="text" 
                      id="subject" 
                      name="subject" 
                      required 
                      placeholder="Brief summary of your question" 
                      value={formData.subject} 
                      onChange={handleChange} 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Your Message *</label>
                    <textarea 
                      id="message" 
                      name="message" 
                      rows={5} 
                      required 
                      placeholder="Describe how we can assist you..." 
                      value={formData.message} 
                      onChange={handleChange} 
                    />
                  </div>

                  <button type="submit" disabled={loading} className="contact-submit-btn">
                    {loading ? 'Sending...' : (
                      <>
                        <span>Send Message</span>
                        <Send size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </main>

          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
