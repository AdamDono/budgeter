import {
    Calculator,
    CreditCard,
    LayoutDashboard,
    LogOut,
    Menu,
    PiggyBank,
    Repeat,
    Settings,
    ShieldCheck,
    Sparkles,
    TrendingDown,
    TrendingUp,
    X
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAI } from '../contexts/AIContext'
import { useAuth } from '../contexts/AuthContext'
import AICoach from './AICoach'

export default function Layout() {
  const { user, logout } = useAuth()
  const { setIsOpen: setChatOpen } = useAI()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', href: '/app/transactions', icon: CreditCard },
    { name: 'Analytics', href: '/app/analytics', icon: TrendingUp },
    { name: 'Savings & Goals', href: '/app/savings', icon: PiggyBank, matchPaths: ['/app/savings', '/app/goals'] },
    { name: 'Bills & Debit Orders', href: '/app/recurring', icon: Repeat, matchPaths: ['/app/recurring', '/app/bills'] },
    { name: 'Debt Payoff', href: '/app/debt', icon: TrendingDown },
    { name: 'Credit Hub', href: '/app/credit-hub', icon: ShieldCheck },
    { name: 'SARS Tax Hub', href: '/app/tax', icon: Calculator },
    { name: 'Settings', href: '/app/settings', icon: Settings },
  ]

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="layout">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/logo_pace_finance.svg" alt="Pace Finance" className="logo-image-sidebar" />
          </div>
          <button 
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon
            const isMatched = item.matchPaths
              ? item.matchPaths.includes(location.pathname)
              : location.pathname === item.href

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={() => `nav-link ${isMatched ? 'nav-link-active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="user-details">
              <p className="user-name">{user?.firstName} {user?.lastName}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} style={{ color: '#ef4444' }} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Mobile header */}
        <header className="mobile-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <img src="/logo_pace_finance.svg" alt="Pace Finance" style={{ height: '28px', width: 'auto' }} />
          <div style={{ width: 24 }}></div>
        </header>

        {/* Page content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav-bar">
        <NavLink 
          to="/app/dashboard" 
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Home</span>
        </NavLink>

        <NavLink 
          to="/app/transactions" 
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <CreditCard size={20} />
          <span>Transactions</span>
        </NavLink>

        <button 
          className="mobile-nav-item"
          onClick={() => setChatOpen(true)}
        >
          <Sparkles size={20} />
          <span>Coach</span>
        </button>

        <NavLink 
          to="/app/savings" 
          className={() => `mobile-nav-item ${['/app/savings', '/app/goals'].includes(location.pathname) ? 'active' : ''}`}
        >
          <PiggyBank size={20} />
          <span>Savings</span>
        </NavLink>

        <NavLink 
          to="/app/debt" 
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <TrendingDown size={20} />
          <span>Debts</span>
        </NavLink>
      </nav>

      <AICoach />
    </div>
  )
}
