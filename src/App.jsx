import React, { useEffect, useMemo, useState } from 'react'
import { loadState, saveState } from './utils/storage.js'
import { formatCurrency, monthKeyFromDate } from './utils/format.js'
import BudgetForm from './components/BudgetForm.jsx'
import TransactionForm from './components/TransactionForm.jsx'
import Filters from './components/Filters.jsx'
import TransactionList from './components/TransactionList.jsx'
import Summary from './components/Summary.jsx'
import ExportImport from './components/ExportImport.jsx'

const STORAGE_KEY = 'budgeter_v1'

export default function App() {
  const [state, setState] = useState(() => loadState(STORAGE_KEY, {
    budgets: [], // { id, name, limit }
    transactions: [], // { id, type: 'expense'|'income', amount, category, date, note }
  }))

  const [filters, setFilters] = useState({
    month: monthKeyFromDate(new Date()),
    category: 'all',
    type: 'all',
    search: '',
  })

  useEffect(() => {
    saveState(STORAGE_KEY, state)
  }, [state])

  const categories = useMemo(() => state.budgets.map(b => b.name), [state.budgets])

  const filteredTx = useMemo(() => {
    return state.transactions.filter(tx => {
      const txMonth = monthKeyFromDate(new Date(tx.date))
      if (filters.month !== 'all' && txMonth !== filters.month) return false
      if (filters.category !== 'all' && tx.category !== filters.category) return false
      if (filters.type !== 'all' && tx.type !== filters.type) return false
      if (filters.search && !(`${tx.note ?? ''}`.toLowerCase().includes(filters.search.toLowerCase()))) return false
      return true
    })
  }, [state.transactions, filters])

  const monthTotals = useMemo(() => {
    const totals = { income: 0, expense: 0 }
    for (const tx of state.transactions) {
      const txMonth = monthKeyFromDate(new Date(tx.date))
      if (filters.month === 'all' || txMonth === filters.month) {
        totals[tx.type] += Number(tx.amount)
      }
    }
    return totals
  }, [state.transactions, filters.month])

  const categorySpend = useMemo(() => {
    const map = {}
    for (const b of state.budgets) map[b.name] = 0
    for (const tx of state.transactions) {
      const txMonth = monthKeyFromDate(new Date(tx.date))
      if (tx.type === 'expense' && (filters.month === 'all' || txMonth === filters.month)) {
        map[tx.category] = (map[tx.category] || 0) + Number(tx.amount)
      }
    }
    return map
  }, [state.transactions, state.budgets, filters.month])

  function addBudget(budget) {
    setState(s => ({ ...s, budgets: [...s.budgets, { ...budget, id: crypto.randomUUID() }] }))
  }

  function removeBudget(id) {
    setState(s => {
      const removed = s.budgets.find(b => b.id === id)
      const removedName = removed?.name
      return {
        ...s,
        budgets: s.budgets.filter(b => b.id !== id),
        transactions: removedName
          ? s.transactions.map(tx => tx.category === removedName ? { ...tx, category: 'Uncategorized' } : tx)
          : s.transactions,
      }
    })
  }

  function addTransaction(tx) {
    setState(s => ({ ...s, transactions: [{ ...tx, id: crypto.randomUUID() }, ...s.transactions] }))
  }

  function removeTransaction(id) {
    setState(s => ({ ...s, transactions: s.transactions.filter(t => t.id !== id) }))
  }

  function clearAll() {
    if (confirm('This will clear all data. Continue?')) {
      setState({ budgets: [], transactions: [] })
    }
  }

  function importData(newState) {
    setState(newState)
  }

  const months = useMemo(() => {
    const set = new Set(state.transactions.map(tx => monthKeyFromDate(new Date(tx.date))))
    return ['all', monthKeyFromDate(new Date()), ...Array.from(set).sort().reverse()]
  }, [state.transactions])

  return (
    <div className="container">
      <header className="app-header">
        <h1>Budgeter</h1>
        <div className="header-actions">
          <button className="btn ghost" onClick={clearAll}>Reset</button>
          <ExportImport data={state} onImport={importData} />
        </div>
      </header>

      <section className="grid two">
        <div className="card">
          <h2>Budgets</h2>
          <BudgetForm onAdd={addBudget} />
          <ul className="list">
            {state.budgets.map(b => {
              const spent = categorySpend[b.name] || 0
              const pct = b.limit ? Math.min(100, Math.round((spent / b.limit) * 100)) : 0
              return (
                <li key={b.id} className="budget-item">
                  <div>
                    <strong>{b.name}</strong>
                    <div className="muted">Limit: {b.limit ? formatCurrency(b.limit) : '—'}</div>
                  </div>
                  <div className="budget-meta">
                    <div className="progress">
                      <div className="bar" style={{ width: pct + '%'}} />
                    </div>
                    <div className="muted">{formatCurrency(spent)} / {b.limit ? formatCurrency(b.limit) : '—'}</div>
                  </div>
                  <button className="btn danger" onClick={() => removeBudget(b.id)}>Delete</button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="card">
          <h2>Add Transaction</h2>
          <TransactionForm categories={[...categories, 'Uncategorized']} onAdd={addTransaction} />
        </div>
      </section>

      <section className="card">
        <h2>Overview</h2>
        <Summary totals={monthTotals} />
      </section>

      <section className="card">
        <div className="list-header">
          <h2>Transactions</h2>
          <Filters
            filters={filters}
            setFilters={setFilters}
            months={months}
            categories={["all", ...categories]}
          />
        </div>
        <TransactionList transactions={filteredTx} onRemove={removeTransaction} />
      </section>

      <footer className="footer">No backend. Data saved locally in your browser.</footer>
    </div>
  )
}
