import { AlertCircle, Bot, MinusCircle, Send, Sparkles, TrendingDown, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { useAI } from '../contexts/AIContext'
import { aiAPI } from '../lib/api'

export default function AICoach() {
  const { isOpen, setIsOpen, initialPrompt, setInitialPrompt } = useAI()
  const [isMinimized, setIsMinimized] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "Hi! I'm your Pace AI Coach. Ask me anything about your spending, debts, or if you can afford that R1,000 treat today! 🇿🇦" }
  ])
  const [loading, setLoading] = useState(false)
  const [healthStatus, setHealthStatus] = useState('good') // good, warning, danger
  
  const chatEndRef = useRef(null)

  const suggestions = [
    { label: "Check my accounts 🏦", prompt: "Give me a summary of all my account balances." },
    { label: "Can I afford R500? 🍦", prompt: "Based on my budget and current balance, can I afford a R500 treat today?" },
    { label: "Highest interest debt? 📉", prompt: "Which of my debts has the highest interest rate and how much is the balance?" },
    { label: "Savings progress 💰", prompt: "How am I doing on my savings goals this month?" }
  ]

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom()
    }
  }, [chatHistory, isOpen, isMinimized])

  useEffect(() => {
    if (isOpen && initialPrompt) {
      handleSendMessage(initialPrompt)
      setInitialPrompt(null)
    }
  }, [isOpen, initialPrompt])

  const handleSendMessage = async (text) => {
    const messageToSend = typeof text === 'string' ? text : userInput
    if (!messageToSend.trim()) return

    const userMessage = { role: 'user', content: messageToSend }
    setChatHistory(prev => [...prev, userMessage])
    setUserInput('')
    setLoading(true)

    try {
      const response = await aiAPI.chat({ 
        message: messageToSend,
        history: chatHistory 
      })

      const botContent = response.data.response
      const botMessage = { role: 'assistant', content: botContent }
      
      // Dynamic Vibe logic: Update status based on keywords (simple heuristic)
      if (botContent.toLowerCase().includes('danger') || botContent.toLowerCase().includes('over budget')) {
        setHealthStatus('danger')
      } else if (botContent.toLowerCase().includes('caution') || botContent.toLowerCase().includes('warning')) {
        setHealthStatus('warning')
      } else {
        setHealthStatus('good')
      }

      setChatHistory(prev => [...prev, botMessage])
    } catch (error) {
      console.error('AI Error:', error)
      const errorMsg = error.response?.data?.error || 'Oops! My brain is a bit laggy. Check your Gemini API Key in the backend!'
      toast.error(errorMsg)
      
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I'm having trouble connecting to my brain. Please make sure the Gemini API Key is set up in your .env file! 🧠🔌" 
      }])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button 
        className={`ai-coach-trigger health-${healthStatus}`} 
        onClick={() => setIsOpen(true)}
        aria-label="Ask Pace AI Coach"
      >
        <Sparkles size={24} className="sparkle-icon" />
        <span className="tooltip">Ask Pace AI Coach</span>
      </button>
    )
  }

  return (
    <div className={`ai-coach-panel ${isMinimized ? 'minimized' : ''} health-${healthStatus}`}>
      <div className="ai-coach-header">
        <div className="header-info">
          <div className={`bot-avatar status-${healthStatus}`}>
            {healthStatus === 'danger' ? <AlertCircle size={20} /> : 
             healthStatus === 'warning' ? <TrendingDown size={20} /> : 
             <Bot size={20} />}
          </div>
          <div>
            <h3>Pace AI Coach</h3>
            <span className={`status-text status-${healthStatus}`}>
              {healthStatus === 'danger' ? 'Financial Alert' : 
               healthStatus === 'warning' ? 'Monitoring' : 
               'Active'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={() => setIsMinimized(!isMinimized)} className="icon-btn">
            <MinusCircle size={18} />
          </button>
          <button onClick={() => setIsOpen(false)} className="icon-btn close">
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="ai-coach-messages">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`message-bubble ${msg.role} fade-in`}>
                <div className="bubble-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-bubble assistant fade-in">
                <div className="bubble-content typing">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="suggestions-container">
            {suggestions.map((s, i) => (
              <button key={i} className="suggestion-chip" onClick={() => handleSendMessage(s.prompt)}>
                {s.label}
              </button>
            ))}
          </div>

          <form className="ai-coach-input" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
            <input 
              type="text" 
              placeholder="Ask about your finances..." 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !userInput.trim()}>
              <Send size={18} />
            </button>
          </form>
        </>
      )}

      {isMinimized && (
        <div className="minimized-preview" onClick={() => setIsMinimized(false)}>
          <p>Tap to resume coaching chat...</p>
        </div>
      )}
    </div>
  )
}
