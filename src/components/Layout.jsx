import {
    Bell,
    Calendar,
    CreditCard,
    DollarSign,
    LayoutDashboard,
    LogOut,
    Menu,
    Repeat,
    Settings,
    ShieldCheck,
    Target,
    TrendingDown,
    TrendingUp,
    X
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Triggers a rebuild to resolve ShieldCheck undefined issues.
export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', href: '/app/transactions', icon: CreditCard },
    { name: 'Fixed Goals', href: '/app/goals', icon: Target },
    { name: 'Savings Pots', href: '/app/savings', icon: DollarSign },
    { name: 'Bills & Reminders', href: '/app/bills', icon: Bell },
    { name: 'Analytics', href: '/app/analytics', icon: TrendingUp },
    { name: 'Recurring', href: '/app/recurring', icon: Repeat },
    { name: 'Spending Trends', href: '/app/trends', icon: TrendingDown },
    { name: 'Debt Tracker', href: '/app/debt', icon: DollarSign },
    { name: 'Credit Hub', href: '/app/credit-hub', icon: ShieldCheck },
    { name: 'Tax Deductions', href: '/app/tax', icon: Calendar },
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
            const isActive = location.pathname === item.href
            
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
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
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1 className="page-title">Pace Finance</h1>
          <div style={{ width: 24 }}></div> {/* Spacer */}
        </header>

        {/* Page content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
