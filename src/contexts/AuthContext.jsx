import React, { createContext, useContext, useEffect, useState } from 'react'
import { authAPI, setGlobalToken } from '../lib/api'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Safe localStorage access
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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(() => safeLocalStorage.getItem('budgeter_token'))

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = safeLocalStorage.getItem('budgeter_token')
      const savedUser = safeLocalStorage.getItem('budgeter_user')
      
      if (savedToken && savedUser) {
        try {
          setToken(savedToken)
          setGlobalToken(savedToken)
          setUser(JSON.parse(savedUser))
          
          // Try to verify token is still valid (skip if backend is down)
          try {
            await authAPI.getProfile()
          } catch (error) {
            console.warn('Could not verify token (backend may be offline):', error.message)
            // Don't logout if it's just a network error
            if (error.response?.status === 401) {
              logout()
            }
          }
        } catch (error) {
          console.error('Token validation failed:', error)
          logout()
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password })
      const { user: userData, token: userToken } = response.data
      
      setUser(userData)
      setToken(userToken)
      setGlobalToken(userToken)
      
      safeLocalStorage.setItem('budgeter_token', userToken)
      safeLocalStorage.setItem('budgeter_user', JSON.stringify(userData))
      
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
      const { user: newUser, token: userToken } = response.data
      
      setUser(newUser)
      setToken(userToken)
      setGlobalToken(userToken)
      
      safeLocalStorage.setItem('budgeter_token', userToken)
      safeLocalStorage.setItem('budgeter_user', JSON.stringify(newUser))
      
      toast.success(`Welcome to Budgeter, ${newUser.firstName}!`)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    safeLocalStorage.removeItem('budgeter_token')
    safeLocalStorage.removeItem('budgeter_user')
    toast.success('Logged out successfully')
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
