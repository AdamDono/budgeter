import { useQuery } from '@tanstack/react-query'
import { CheckCircle, FileText, Upload } from 'lucide-react'
import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { budgetsAPI, importAPI } from '../lib/api'

// Set up PDF.js worker using local bundle
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// Detect common SA bank CSV formats
function detectBankFormat(headers) {
  const h = headers.map(h => h.toLowerCase().trim())
  if (h.some(x => x.includes('fnb') || x.includes('first national'))) return 'FNB'
  if (h.includes('debit amount') && h.includes('credit amount')) return 'STANDARD_BANK'
  if (h.includes('debits') && h.includes('credits')) return 'NEDBANK'
  if (h.includes('debit') && h.includes('credit') && h.includes('balance')) return 'ABSA'
  return 'GENERIC'
}

// Parse a CSV row into a transaction
function parseRow(row, headers, format, categories) {
  const get = (key) => {
    const idx = headers.findIndex(h => h.toLowerCase().trim().includes(key.toLowerCase()))
    return idx >= 0 ? (row[idx] || '').trim() : ''
  }

  let amount = 0
  let type = 'expense'
  let date = ''
  let description = ''

  switch (format) {
    case 'STANDARD_BANK':
    case 'ABSA': {
      const debit = parseFloat(get('debit').replace(/[^0-9.]/g, '')) || 0
      const credit = parseFloat(get('credit').replace(/[^0-9.]/g, '')) || 0
      amount = debit > 0 ? debit : credit
      type = credit > 0 ? 'income' : 'expense'
      description = get('description') || get('narration') || get('reference')
      date = get('date')
      break
    }
    case 'NEDBANK': {
      const debitAmt = parseFloat(get('debits').replace(/[^0-9.]/g, '')) || 0
      const creditAmt = parseFloat(get('credits').replace(/[^0-9.]/g, '')) || 0
      amount = debitAmt > 0 ? debitAmt : creditAmt
      type = creditAmt > 0 ? 'income' : 'expense'
      description = get('description') || get('detail')
      date = get('date')
      break
    }
    default: {
      const rawAmount = parseFloat((get('amount') || get('value')).replace(/[^0-9.-]/g, '')) || 0
      amount = Math.abs(rawAmount)
      type = rawAmount >= 0 ? 'income' : 'expense'
      description = get('description') || get('narration') || get('memo') || get('reference')
      date = get('date') || get('transaction date') || get('trans date')
    }
  }

  let parsedDate = null
  if (date) {
    const d = date.replace(/\./g, '/').replace(/-/g, '/')
    const parts = d.split('/')
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      } else {
        parsedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
      }
    }
  }

  return {
    description: description || 'Imported transaction',
    amount: isNaN(amount) ? 0 : amount,
    type,
    transactionDate: parsedDate || new Date().toISOString().split('T')[0],
    categoryId: null,
    _valid: amount > 0 && parsedDate !== null
  }
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  
  const splitRow = (line) => {
    const result = []
    let inQuote = false
    let current = ''
    for (const char of line) {
      if (char === '"') {
        inQuote = !inQuote
      } else if (char === ',' && !inQuote) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  const headers = splitRow(lines[0])
  const rows = lines.slice(1).map(l => splitRow(l))
  return { headers, rows }
}

// PDF Parsing Logic - Enhanced for SA Banks
async function extractTransactionsFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const allRows = []

  // Bank-specific heuristic settings
  const dateRegex = /(\d{1,2} [A-Z][a-z]{2}|\d{4}[\-\/\.]\d{2}[\-\/\.]\d{2}|\d{2}[\-\/\.]\d{2}[\-\/\.]\d{4})/gi
  const moneyRegex = /(-?R?\s?[\d\s,']+\.\d{2})/g

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    
    // Group text items by Y coordinate to reconstruct lines
    const rowsMap = {}
    content.items.forEach(item => {
      const y = Math.round(item.transform[5])
      if (!rowsMap[y]) rowsMap[y] = []
      rowsMap[y].push(item)
    })
    
    // Process lines from top to bottom
    const sortedY = Object.keys(rowsMap).sort((a, b) => b - a)
    
    sortedY.forEach(y => {
      // Sort items in the row from left to right
      const rowItems = rowsMap[y].sort((a, b) => a.transform[4] - b.transform[4])
      const line = rowItems.map(item => item.str).join(" ").trim()
      
      // Basic check: line must have a date and at least one money amount
      const dateMatches = line.match(dateRegex)
      const moneyMatches = line.match(moneyRegex)
      
      if (dateMatches && moneyMatches) {
        const date = dateMatches[0]
        
        // Clean money matches (remove R, spaces, commas for parsing)
        const parsedAmounts = moneyMatches.map(m => {
          const clean = m.replace(/[R\s,']/g, "")
          return { original: m, value: parseFloat(clean) }
        }).filter(m => !isNaN(m.value) && Math.abs(m.value) > 0)

        if (parsedAmounts.length > 0) {
          // HEURISTIC: In most SA bank statements:
          // If 1 amount: It's the transaction amount
          // If 2+ amounts: One is likely the Amount, another is the Balance.
          // In FNB/Standard/Nedbank, usually Amount comes before Balance left-to-right.
          const txAmount = parsedAmounts[0]
          
          let description = line
            .replace(date, "")
            .replace(txAmount.original, "")
          
          // Remove balance if detected
          if (parsedAmounts.length > 1) {
            description = description.replace(parsedAmounts[1].original, "")
          }

          // Determine type
          let type = 'expense'
          if (txAmount.value > 0) type = 'income' // If positive, assume income
          if (line.includes("-") || line.toLowerCase().includes(" dr") || line.includes("(")) {
            type = 'expense'
          }

          allRows.push({
            date,
            description: description.replace(/\s+/g, ' ').trim() || 'Imported Transaction',
            amount: Math.abs(txAmount.value),
            type: type
          })
        }
      }
    })
  }
  return allRows
}

function parseNativeDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  
  // Handle DD MMM (e.g. 01 JAN)
  const monthMap = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' }
  const upper = dateStr.toUpperCase()
  const parts = upper.match(/(\d{1,2})\s([A-Z]{3})/)
  
  if (parts && monthMap[parts[2]]) {
    const year = new Date().getFullYear()
    return `${year}-${monthMap[parts[2]]}-${parts[1].padStart(2, '0')}`
  }
  
  // Handle ISO or common YYYY/MM/DD
  const isoMatch = dateStr.match(/(\d{4})[\-\/\.](\d{2})[\-\/\.](\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  // Handle DD/MM/YYYY
  const dmYMatch = dateStr.match(/(\d{2})[\-\/\.](\d{2})[\-\/\.](\d{4})/)
  if (dmYMatch) return `${dmYMatch[3]}-${dmYMatch[2]}-${dmYMatch[1]}`
  
  return new Date().toISOString().split('T')[0]
}

export default function CSVImport({ onClose, onSuccess }) {
  const [step, setStep] = useState('upload') 
  const [format, setFormat] = useState('GENERIC')
  const [editedRows, setEditedRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef()

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await budgetsAPI.getCategories()).data,
  })
  const categories = categoriesData?.categories || []

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const isPDF = file.name.endsWith('.pdf')
    const isCSV = file.name.endsWith('.csv')

    if (!isPDF && !isCSV) {
      toast.error('Please upload a .csv or .pdf file')
      return
    }

    try {
      if (isCSV) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const { headers, rows } = parseCSV(ev.target.result)
          const detectedFormat = detectBankFormat(headers)
          setFormat(detectedFormat)
          const parsed = rows
            .map(row => parseRow(row, headers, detectedFormat, categories))
            .filter(r => r._valid && r.amount > 0)
          
          if (parsed.length === 0) {
            toast.error('No valid transactions found in CSV.')
            return
          }
          setEditedRows(parsed.map((r, i) => ({ ...r, _id: i, _include: true, categoryId: '' })))
          setStep('preview')
        }
        reader.readAsText(file)
      } else {
        // PDF Path
        toast.loading('Analyzing PDF statement...')
        const pdfRows = await extractTransactionsFromPDF(file)
        toast.dismiss()
        
        if (pdfRows.length === 0) {
          toast.error('Could not extract transactions. PDF might be encrypted or scanned (no selectable text).')
          return
        }

        const parsed = pdfRows.map((r, i) => ({
          _id: i,
          _include: true,
          description: r.description,
          amount: r.amount,
          type: r.type,
          transactionDate: parseNativeDate(r.date),
          categoryId: ''
        }))
        
        setFormat('PDF Statement')
        setEditedRows(parsed)
        setStep('preview')
        toast.success(`Extracted ${parsed.length} transactions from PDF`)
      }
    } catch (err) {
      console.error(err)
      toast.dismiss()
      toast.error('Failed to process file. Ensure it is a valid bank statement.')
    }
  }

  const handleImport = async () => {
    const toImport = editedRows.filter(r => r._include).map(r => ({
      type: r.type,
      amount: r.amount,
      description: r.description,
      transactionDate: r.transactionDate,
      categoryId: r.categoryId ? parseInt(r.categoryId) : null,
    }))

    if (toImport.length === 0) {
      toast.error('Select at least one transaction to import')
      return
    }

    setImporting(true)
    try {
      const res = await importAPI.importTransactions(toImport)
      setResult({ imported: res.data.imported, failed: res.data.failed || 0 })
      setStep('done')
      toast.success(`Successfully imported ${res.data.imported} transactions!`)
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const updateRow = (id, field, value) => {
    setEditedRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r))
  }

  const selectedCount = editedRows.filter(r => r._include).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Import Bank Statement</h2>
            <p className="section-subtitle">Upload your bank statement (CSV or PDF) to import transactions</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="import-steps">
          {['Upload', 'Preview & Map', 'Done'].map((label, i) => {
            const stepKeys = ['upload', 'preview', 'done']
            const active = stepKeys.indexOf(step) >= i
            return (
              <div key={label} className={`import-step ${active ? 'active' : ''}`}>
                <div className="step-dot">{i + 1}</div>
                <span>{label}</span>
              </div>
            )
          })}
        </div>

        {step === 'upload' && (
          <div className="import-upload-zone">
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              <Upload size={48} className="upload-icon" />
              <h3>Drop your statement here</h3>
              <p>Supports <strong>CSV</strong> and <strong>PDF</strong> formats</p>
              <div className="supported-banks">
                <FileText size={16} /> <span>FNB / Standard / Nedbank / ABSA</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
            </div>
            <div className="import-tips">
              <h4>💡 Pro Tips:</h4>
              <ul>
                <li><strong>PDF Support:</strong> Best with digital statements. Scanned images or password-protected files may not work.</li>
                <li><strong>Privacy:</strong> Data is handled locally in your browser.</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="import-preview">
            <div className="preview-header">
              <div>
                <span className="bank-badge">{format}</span>
                <span className="preview-count">{selectedCount} of {editedRows.length} selected</span>
              </div>
              <div className="preview-actions">
                <button className="btn ghost small" onClick={() => setEditedRows(prev => prev.map(r => ({ ...r, _include: true })))}>Select All</button>
                <button className="btn ghost small" onClick={() => setEditedRows(prev => prev.map(r => ({ ...r, _include: false })))}>Deselect All</button>
              </div>
            </div>

            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {editedRows.map(row => (
                    <tr key={row._id} className={!row._include ? 'row-excluded' : ''}>
                      <td><input type="checkbox" checked={row._include} onChange={e => updateRow(row._id, '_include', e.target.checked)} /></td>
                      <td className="date-cell">{row.transactionDate}</td>
                      <td><input className="inline-edit" value={row.description} onChange={e => updateRow(row._id, 'description', e.target.value)} /></td>
                      <td>
                        <select className="inline-select" value={row.type} onChange={e => updateRow(row._id, 'type', e.target.value)}>
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </td>
                      <td className={`amount-cell ${row.type}`}>R{parseFloat(row.amount).toFixed(2)}</td>
                      <td>
                        <select className="inline-select" value={row.categoryId} onChange={e => updateRow(row._id, 'categoryId', e.target.value)}>
                          <option value="">Uncategorized</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button className="btn ghost" onClick={() => setStep('upload')}>← Back</button>
              <button className="btn primary" onClick={handleImport} disabled={importing || selectedCount === 0}>
                {importing ? 'Importing...' : `Import ${selectedCount} Transactions`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="import-done">
            <CheckCircle size={64} className="import-success-icon" />
            <h3>Import Complete!</h3>
            <p>Successfully imported <strong>{result.imported}</strong> transactions.</p>
            <button className="btn primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
