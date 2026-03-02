import { createContext, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { authAPI } from '../lib/api'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Safe localStorage access for persistent user data
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.warn('localStorage access denied:', error)
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.warn('localStorage write denied:', error)
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('localStorage remove denied:', error)
    }
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = safeLocalStorage.getItem('pacedebt_user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await authAPI.getProfile()
        const userData = response.data.user
        setUser(userData)
        safeLocalStorage.setItem('pacedebt_user', JSON.stringify(userData))
      } catch (error) {
        // If 401, clear the local user state
        if (error.response?.status === 401) {
          setUser(null)
          safeLocalStorage.removeItem('pacedebt_user')
        }
        console.warn('Auth check failed:', error.message)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password })
      const { user: userData } = response.data
      
      setUser(userData)
      safeLocalStorage.setItem('pacedebt_user', JSON.stringify(userData))
      
      toast.success(`Welcome back, ${userData.firstName}!`)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData)
      const { user: newUser } = response.data
      
      setUser(newUser)
      safeLocalStorage.setItem('pacedebt_user', JSON.stringify(newUser))
      
      toast.success(`Welcome to Pace Finance, ${newUser.firstName}!`)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.warn('Backend logout failed:', error)
    }
    setUser(null)
    safeLocalStorage.removeItem('pacedebt_user')
    // Clear legacy tokens if they still exist
    safeLocalStorage.removeItem('pacedebt_token')
    toast.success('Logged out successfully')
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
