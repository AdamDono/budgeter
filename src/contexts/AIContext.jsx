import { createContext, useContext, useState } from 'react'

const AIContext = createContext()

export function AIProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialPrompt, setInitialPrompt] = useState(null)

  const openCoach = (prompt = null) => {
    setIsOpen(true)
    if (prompt) {
      setInitialPrompt(prompt)
    }
  }

  const closeCoach = () => {
    setIsOpen(false)
    setInitialPrompt(null)
  }

  return (
    <AIContext.Provider value={{ isOpen, setIsOpen, initialPrompt, setInitialPrompt, openCoach, closeCoach }}>
      {children}
    </AIContext.Provider>
  )
}

export const useAI = () => useContext(AIContext)
