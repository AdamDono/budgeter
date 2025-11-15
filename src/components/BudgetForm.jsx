import React, { useState } from 'react'

export default function BudgetForm({ onAdd }) {
  const [name, setName] = useState('')
  const [limit, setLimit] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name: name.trim(), limit: limit ? Number(limit) : null })
    setName('')
    setLimit('')
  }

  return (
    <form onSubmit={submit} className="form row">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Category (e.g., Groceries)" />
      <input type="number" min="0" step="0.01" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Monthly limit (optional)" />
      <button className="btn" type="submit">Add</button>
    </form>
  )
}
