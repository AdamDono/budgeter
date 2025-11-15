import React from 'react'

export default function Filters({ filters, setFilters, months, categories }) {
  return (
    <div className="form row wrap">
      <select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}>
        {months.map(m => <option key={m} value={m}>{m === 'all' ? 'All months' : m}</option>)}
      </select>
      <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
        <option value="all">All types</option>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search notes" />
    </div>
  )
}
