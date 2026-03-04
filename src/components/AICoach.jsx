import { Bot, MinusCircle, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { aiAPI } from '../lib/api'

export default function AICoach() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "Hi! I'm your Pace AI Coach. Ask me anything about your spending, debts, or if you can afford that R1,000 treat today! 🇿🇦" }
  ])
  const [loading, setLoading] = useState(false)
  
  const chatEndRef = useRef(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom()
    }
  }, [chatHistory, isOpen, isMinimized])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!userInput.trim()) return

    const userMessage = { role: 'user', content: userInput }
    setChatHistory(prev => [...prev, userMessage])
    setUserInput('')
    setLoading(true)

    try {
      const response = await aiAPI.chat({ 
        message: userInput,
        history: chatHistory 
      })

      const botMessage = { role: 'assistant', content: response.data.response }
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
        className="ai-coach-trigger" 
        onClick={() => setIsOpen(true)}
        aria-label="Ask Pace AI Coach"
      >
        <Sparkles size={24} className="sparkle-icon" />
        <span className="tooltip">Ask Pace AI Coach</span>
      </button>
    )
  }

  return (
    <div className={`ai-coach-panel ${isMinimized ? 'minimized' : ''}`}>
      <div className="ai-coach-header">
        <div className="header-info">
          <div className="bot-avatar">
            <Bot size={20} />
          </div>
          <div>
            <h3>Pace AI Coach</h3>
            <span className="status-online">Online</span>
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
              <div key={idx} className={`message-bubble ${msg.role}`}>
                <div className="bubble-content">
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-bubble assistant">
                <div className="bubble-content typing">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="ai-coach-input" onSubmit={handleSendMessage}>
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
