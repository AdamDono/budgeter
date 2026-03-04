import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
}

// Transactions API
export const transactionsAPI = {
  getAll: (params = {}) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  getAnalytics: (period = '30d') => api.get(`/transactions/analytics?period=${period}`),
}

// Budget Categories API
export const budgetsAPI = {
  getCategories: () => api.get('/budgets/categories'),
  createCategory: (data) => api.post('/budgets/categories', data),
  updateCategory: (id, data) => api.put(`/budgets/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/budgets/categories/${id}`),
  getPerformance: (month, year) => api.get(`/budgets/performance?month=${month}&year=${year}`),
  getTrends: (categoryId, months = 6) => api.get(`/budgets/trends?categoryId=${categoryId}&months=${months}`),
}

// Goals API
export const goalsAPI = {
  getAll: () => api.get('/goals'),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  contribute: (id, data) => api.post(`/goals/${id}/contribute`, data),
  getAnalytics: (id) => api.get(`/goals/${id}/analytics`),
}

// Recurring Transactions API
export const recurringAPI = {
  getAll: () => api.get('/recurring'),
  create: (data) => api.post('/recurring', data),
  update: (id, data) => api.put(`/recurring/${id}`, data),
  delete: (id) => api.delete(`/recurring/${id}`),
  execute: (id) => api.post(`/recurring/${id}/execute`),
  getUpcoming: (days = 7) => api.get(`/recurring/upcoming?days=${days}`),
  getOverdue: () => api.get('/recurring/overdue'),
}

// Analytics API
export const analyticsAPI = {
  getDashboard: (period = '30d') => api.get(`/analytics/dashboard?period=${period}`),
  getInsights: () => api.get('/analytics/insights'),
}

// Debts API
export const debtsAPI = {
  getAll: () => api.get('/debts'),
  create: (data) => api.post('/debts', data),
  update: (id, data) => api.put(`/debts/${id}`, data),
  delete: (id) => api.delete(`/debts/${id}`),
  calculatePayoff: (strategy = 'snowball') => api.post('/debts/calculate/payoff', { strategy }),
}

// Savings API
export const savingsAPI = {
    getAll: () => api.get('/savings'),
    create: (data) => api.post('/savings', data),
    update: (id, data) => api.put(`/savings/${id}`, data),
    delete: (id) => api.delete(`/savings/${id}`),
}

// Tax API
export const taxAPI = {
  getDeductions: (year) => api.get(`/taxes?year=${year}`),
  createDeduction: (data) => api.post('/taxes', data),
  updateDeduction: (id, data) => api.put(`/taxes/${id}`, data),
  deleteDeduction: (id) => api.delete(`/taxes/${id}`),
  getSummary: (year, taxRate = 28) => api.get(`/taxes/summary/${year}?taxRate=${taxRate}`),
}

// Tips API
export const tipsAPI = {
  getAll: (category = 'all', limit = 50) => api.get(`/tips?category=${category}&limit=${limit}`),
  getMyTips: () => api.get('/tips/user/my-tips'),
  create: (data) => api.post('/tips', data),
  update: (id, data) => api.put(`/tips/${id}`, data),
  delete: (id) => api.delete(`/tips/${id}`),
  like: (id) => api.post(`/tips/${id}/like`),
  addComment: (id, comment) => api.post(`/tips/${id}/comment`, { comment }),
  getComments: (id) => api.get(`/tips/${id}/comments`),
}

// Bills API
export const billsAPI = {
  getAll: () => api.get('/bills'),
  getUpcoming: (days = 7) => api.get(`/bills/upcoming?days=${days}`),
  create: (data) => api.post('/bills', data),
  update: (id, data) => api.put(`/bills/${id}`, data),
  markPaid: (id) => api.post(`/bills/${id}/pay`),
  delete: (id) => api.delete(`/bills/${id}`),
}

// Credit Score API
export const creditAPI = {
  getLatest: () => api.get('/credit'),
  update: (data) => api.post('/credit', data),
}

// AI API
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
}

// CSV Import API (batch create transactions)
export const importAPI = {
  importTransactions: (transactions) => api.post('/transactions/import', { transactions }),
}

// Forex — uses free frankfurter.app (no API key needed)
export const forexAPI = {
  getRates: async (base = 'ZAR') => {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=USD,EUR,GBP,AED,CNY`)
    return res.json()
  },
  getHistorical: async (base = 'ZAR', days = 30) => {
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    const res = await fetch(`https://api.frankfurter.app/${start}..${end}?from=${base}&to=USD,EUR,GBP`)
    return res.json()
  }
}

export default api
