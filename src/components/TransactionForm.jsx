import React, { useState } from 'react'

export default function TransactionForm({ onAdd, categories }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(categories?.[0] || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!amount) return
    onAdd({ type, amount: Number(amount), category, date, note })
    setAmount('')
    setNote('')
  }

  return (
    <form onSubmit={submit} className="form grid three">
      <select value={type} onChange={e => setType(e.target.value)}>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
      <select value={category} onChange={e => setCategory(e.target.value)}>
        {categories?.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" />
      <button className="btn" type="submit">Add</button>
    </form>
  )
}
