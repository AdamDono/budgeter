import React from 'react'
import { formatCurrency } from '../utils/format.js'

export default function TransactionList({ transactions, onRemove }) {
  if (!transactions.length) return <div className="muted">No transactions match your filters.</div>

  return (
    <ul className="list">
      {transactions.map(tx => (
        <li key={tx.id} className="tx-item">
          <div className="tx-main">
            <div className={`pill ${tx.type}`}>{tx.type}</div>
            <div className="tx-note">{tx.note || '—'}</div>
          </div>
          <div className="tx-meta">
            <div className={`tx-amount ${tx.type}`}>{formatCurrency(tx.amount)}</div>
            <div className="muted">{tx.category} • {new Date(tx.date).toLocaleDateString()}</div>
          </div>
          <button className="btn danger" onClick={() => onRemove(tx.id)}>Delete</button>
        </li>
      ))}
    </ul>
  )
}
