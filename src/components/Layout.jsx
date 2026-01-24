import {
    Calendar,
    CreditCard,
    DollarSign,
    LayoutDashboard,
    LogOut,
    Menu,
    Repeat,
    Settings,
    Target,
    TrendingDown,
    TrendingUp,
    X
} from 'lucide-react'
import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', href: '/app/transactions', icon: CreditCard },
    { name: 'Goals', href: '/app/goals', icon: Target },
    { name: 'Savings', href: '/app/savings', icon: DollarSign },
    { name: 'Analytics', href: '/app/analytics', icon: TrendingUp },
    { name: 'Recurring', href: '/app/recurring', icon: Repeat },
    { name: 'Trends', href: '/app/trends', icon: TrendingDown },
    { name: 'Debt', href: '/app/debt', icon: DollarSign },
    { name: 'Tax', href: '/app/tax', icon: Calendar },
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
            <img src="/logo_blue_transparent.png" alt="PaceDebt" className="logo-image-sidebar" />
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
            const isActive = location.pathname === item.href
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
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
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Mobile header */}
        <header className="mobile-header">
          <button 
            className="menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="logo-container">
            <img src="/logo_blue_transparent.png" alt="PaceDebt" className="logo-image-mobile" />
          </div>
        </header>

        {/* Page content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
