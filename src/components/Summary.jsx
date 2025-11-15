import React from 'react'
import { formatCurrency } from '../utils/format.js'

export default function Summary({ totals }) {
  const net = totals.income - totals.expense
  return (
    <div className="summary">
      <div className="summary-item">
        <div className="muted">Income</div>
        <div className="pos">{formatCurrency(totals.income)}</div>
      </div>
      <div className="summary-item">
        <div className="muted">Expenses</div>
        <div className="neg">{formatCurrency(totals.expense)}</div>
      </div>
      <div className="summary-item">
        <div className="muted">Net</div>
        <div className={net >= 0 ? 'pos' : 'neg'}>{formatCurrency(net)}</div>
      </div>
    </div>
  )
}
