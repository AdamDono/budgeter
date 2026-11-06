import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle, FileText, Loader2, ShieldCheck, Sparkles, Upload } from 'lucide-react'
import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { aiAPI, billsAPI, budgetsAPI, debtsAPI, goalsAPI, importAPI, savingsAPI, taxAPI } from '../lib/api'

// Set up PDF.js worker using local bundle
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker
} catch (err) {
  console.warn('PDF.js worker init warning:', err)
}

// ─── SA Smart Auto-Categorizer ───────────────────────────────────────────────
function autoCategorize(description, categories) {
  if (!description || !categories?.length) return ''
  const d = description.toLowerCase()

  const rules = [
    {
      name: 'Salary',
      keywords: [
        'salary', 'payroll', 'remuneration', 'wages', 'nett pay', 'net pay',
        'basic pay', 'gross pay', 'monthly pay', 'employee pay', 'staff pay',
        'pay credit', 'salaris', 'payment received', 'inward transfer',
        'inward eft', 'direct deposit', 'credit transfer', 'salary credit',
        'net salary', 'sal/wages', 'payslip',
      ],
    },
    {
      name: 'Groceries',
      keywords: [
        'woolworths', 'woolies', 'pick n pay', 'pnp', 'checkers', 'spar',
        'shoprite', 'food lover', 'ok foods', 'makro', 'game store',
        'grocery', 'groceries', 'supermarket', 'hyper', 'costco',
        'boxer super', 'usave', 'soweto', 'kwaxuma',
      ],
    },
    {
      name: 'Petrol',
      keywords: [
        'shell', 'engen', 'bp ', 'caltex', 'sasol', 'astron', 'total petrol',
        'petrol', 'fuel', 'filling station', 'garage', 'forecourt',
        'puma energy',
      ],
    },
    {
      name: 'Restaurants',
      keywords: [
        "nando's", 'nandos', 'steers', 'kfc', 'mcdonalds', 'mc donalds',
        'burger king', 'wimpy', 'spur', 'ocean basket', 'panarottis',
        "roman's pizza", 'romans pizza', 'debonairs', "domino's", 'dominoes',
        'pizza hut', 'fishaways', 'cappuccinos', 'mugg & bean', 'mugg and bean',
        'vida e caffe', 'starbucks', 'uber eats', 'mr d food', 'mr delivery',
        'bolt food', 'order in', 'restaurant', 'takeaway', 'take away', 'cafe',
        'diner', 'grill', 'bistro', 'eatery', 'coffee',
      ],
    },
    {
      name: 'Transport',
      keywords: [
        'uber', 'bolt ride', 'taxify', 'indriver', 'myciti', 'metrorail',
        'prasa', 'gautrain', 'bus ticket', 'transit', 'e-toll', 'etoll',
        'highway toll', 'toll gate', 'sanral', 'intercape', 'greyhound',
        'translux', 'taxi', 'cab ',
      ],
    },
    {
      name: 'Utilities',
      keywords: [
        'eskom', 'city power', 'electricity', 'prepaid elec', 'municipal',
        'rates and taxes', 'water & sewer', 'refuse removal', 'telkom',
        'openserve', 'fibre', 'internet', 'broadband', 'rain ',
        'dstv', 'showmax', 'netflix', 'spotify', 'apple music',
        'vodacom', 'mtn ', 'cell c', 'telkom mobile', 'airtime', 'data bundle',
        'prepaid data', 'admin fee', 'account fee', 'bank fee', 'service charge',
        'monthly account', 'value added services', 'prepaid purchase',
      ],
    },
    {
      name: 'Rent/Bond',
      keywords: [
        'rent', 'bond payment', 'mortgage', 'lease', 'landlord',
        'property rental', 'home loan', 'accommodation',
      ],
    },
    {
      name: 'Insurance',
      keywords: [
        'outsurance', 'old mutual', 'discovery insure', 'momentum insure',
        '1life', 'sanlam', 'liberty life', 'hollard', 'miway', 'king price',
        'auto and general', 'auto & general', 'mutual & federal',
        'insurance', 'assurance', 'life cover', 'funeral cover',
        'short term insur', 'uif', 'unemployment insurance',
      ],
    },
    {
      name: 'Medical',
      keywords: [
        'clicks ', 'dis-chem', 'dischem', 'pharmacy', 'chemist',
        'netcare', 'life healthcare', 'mediclinic', 'intercare',
        'doctor', 'hospital', 'dentist', 'optometrist', 'physiotherapy',
        'medical', 'health ', 'chronic', 'prescription', 'script',
        'discovery health', 'bonitas', 'medihelp', 'bestmed',
      ],
    },
    {
      name: 'Education',
      keywords: [
        'school fees', 'university', 'varsity', 'college fees', 'tuition',
        'education', 'wits ', 'uct ', 'stellenbosch', 'unisa', 'uj ',
        'tut ', 'nmu ', 'ukzn', 'dut ', 'cput ', 'vut ',
        'student loan', 'nsfas', 'course fee', 'training',
      ],
    },
    {
      name: 'Clothing',
      keywords: [
        'mr price', 'mrp ', 'edgars', 'jet store', 'pep store', 'ackermans',
        'h&m', 'zara', 'truworths', 'cape union mart', 'exact ', 'foschini',
        'relay jeans', 'paul simon', 'markham', 'john craig',
        'clothing', 'fashion', 'apparel', 'boutique',
      ],
    },
    {
      name: 'Entertainment',
      keywords: [
        'ster kinekor', 'nu metro', 'cinema', 'movies', 'event ticket',
        'ticketpro', 'computicket', 'gaming', 'playstation', 'xbox', 'steam',
        'planet fitness', 'virgin active', 'gymers', 'gym ', 'crossfit',
        'netflix', 'showmax', 'spotify', 'apple tv',
        'entertainment', 'concert', 'comedy', 'x corp', 'recurring card purchase',
        'card purchase', 'atm cash', 'cash withdrawal', 'atm cash withdrawal',
        'withdrawal atm',
      ],
    },
    {
      name: 'Investment',
      keywords: [
        'easy equities', 'etfsa', 'satrix', 'absa stockbrokers',
        'fnb securities', 'nedbank invest', 'standard bank online share',
        'tax free savings', 'tfsa', 'unit trust', 'etf ', 'shares purchase',
        'investment transfer', 'invest ', 'retirement annuity', 'pension',
        'provident fund', 'allan gray', 'sygnia', 'coronation',
      ],
    },
    {
      name: 'Savings Contribution',
      keywords: [
        'savings transfer', 'savings account', 'fixed deposit', 'notice account',
        'money market', '32 day', '60 day', 'savings pot',
      ],
    },
    {
      name: 'Debt Repayment',
      keywords: [
        'credit card payment', 'loan repayment', 'instalment', 'wesbank',
        'vehicle finance', 'car payment', 'fnb vehicle', 'std bank vaf',
        'debt ', 'store card', 'account payment', 'flexi reserve',
        'personal loan', 'overdraft', 'garnishee', 'staff loan',
      ],
    },
  ]

  for (const rule of rules) {
    if (rule.keywords.some(kw => d.includes(kw))) {
      const cat = categories.find(c => c.name === rule.name)
      if (cat) return cat.id.toString()
    }
  }

  return ''
}

// ─── Smart Entity Matcher (Matches statement/payslip rows to User's Debts, Bills, Savings, Goals) ───
function autoMatchEntities(description, type, { debts = [], bills = [], savings = [], goals = [], categories = [] }, aiHints = {}) {
  const d = (description || '').toLowerCase()
  const findNameMatch = (items) => {
    for (const item of items) {
      const name = (item.name || '').toLowerCase().trim()
      if (!name || name.length < 2) continue
      if (d.includes(name)) return String(item.id)
      const tokens = name.split(/[\s\-_\/]+/).filter(t => t.length >= 3 && !['loan', 'card', 'bank', 'account', 'pot', 'bill', 'the', 'and'].includes(t))
      if (tokens.length > 0 && tokens.some(tok => d.includes(tok))) {
        return String(item.id)
      }
    }
    return ''
  }

  let debtId = aiHints.debtId ? String(aiHints.debtId) : ''
  let billId = aiHints.billId ? String(aiHints.billId) : ''
  let savingsId = aiHints.savingsId ? String(aiHints.savingsId) : ''
  let goalId = aiHints.goalId ? String(aiHints.goalId) : ''

  if (!debtId && type === 'expense') {
    debtId = findNameMatch(debts.filter(x => parseFloat(x.balance) > 0))
  }
  if (!billId && !debtId && type === 'expense') {
    billId = findNameMatch(bills.filter(x => !x.is_paid))
  }
  if (!savingsId && !debtId && !billId) {
    savingsId = findNameMatch(savings)
  }
  if (!goalId && !debtId && !billId && !savingsId) {
    goalId = findNameMatch(goals.filter(x => !x.is_achieved))
  }

  let linkTarget = ''
  if (debtId) linkTarget = `debt:${debtId}`
  else if (billId) linkTarget = `bill:${billId}`
  else if (savingsId) linkTarget = `savings:${savingsId}`
  else if (goalId) linkTarget = `goal:${goalId}`

  let matchedCategoryId = aiHints.categoryId ? String(aiHints.categoryId) : ''
  if (debtId && !matchedCategoryId) {
    const debtCat = categories.find(c => c.name === 'Debt Repayment')
    if (debtCat) matchedCategoryId = String(debtCat.id)
  } else if (savingsId && !matchedCategoryId) {
    const savCat = categories.find(c => c.name === 'Savings Contribution')
    if (savCat) matchedCategoryId = String(savCat.id)
  }

  return {
    linkTarget,
    categoryId: matchedCategoryId || autoCategorize(description, categories)
  }
}

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
function parseRow(row, headers, format) {
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
      const rawAmount = parseFloat((get('amount') || get('value') || get('nett') || get('total')).replace(/[^0-9.-]/g, '')) || 0
      amount = Math.abs(rawAmount)
      type = rawAmount >= 0 ? 'income' : 'expense'
      description = get('description') || get('narration') || get('memo') || get('reference') || get('item')
      date = get('date') || get('transaction date') || get('trans date') || get('pay date')
    }
  }

  const parsedDate = parseNativeDate(date)

  return {
    description: description || 'Imported transaction',
    amount: isNaN(amount) ? 0 : amount,
    type,
    transactionDate: parsedDate,
    categoryId: null,
    _valid: amount > 0
  }
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  
  const splitRow = (line) => {
    const result = []
    let inQuote = false
    let current = ''
    for (const char of line) {
      if (char === '"') {
        inQuote = !inQuote
      } else if ((char === ',' || char === ';') && !inQuote) {
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

// Convert File to Base64 string (without data:...;base64, prefix) for Gemini Multimodal
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = String(reader.result || '')
      const base64 = res.includes(',') ? res.split(',')[1] : res
      resolve(base64)
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

// Extract raw line-by-line text from PDF with a strict 6-second timeout so PDF.js worker never hangs
async function extractRawTextFromPDF(file) {
  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(''), 6000))
  const parsePromise = (async () => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      let pdf
      try {
        pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
      } catch {
        pdf = await pdfjs.getDocument({ data: arrayBuffer, disableWorker: true }).promise
      }
      const lines = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const rowsMap = {}
        content.items.forEach(item => {
          const y = Math.round((item.transform?.[5] || 0) / 4) * 4
          if (!rowsMap[y]) rowsMap[y] = []
          rowsMap[y].push(item)
        })
        const sortedY = Object.keys(rowsMap).sort((a, b) => b - a)
        sortedY.forEach(y => {
          const rowItems = rowsMap[y].sort((a, b) => (a.transform?.[4] || 0) - (b.transform?.[4] || 0))
          const line = rowItems.map(item => item.str).join(' ').trim()
          if (line.length > 1) lines.push(line)
        })
      }
      return lines.join('\n')
    } catch (err) {
      console.warn('Client PDF text extraction skipped:', err.message)
      return ''
    }
  })()

  return Promise.race([parsePromise, timeoutPromise])
}

function parseNativeDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  const clean = String(dateStr).trim()

  const monthMap = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' }
  const upper = clean.toUpperCase()

  // Handle DD MMM YYYY or DD MMM YY or DD MMM (e.g. 01 Aug 2026, 1-Aug-2026, 01 August 2026)
  const dmyText = upper.match(/(\d{1,2})[\s\-\/\.]+([A-Z]{3})[A-Z]*(?:[\s\-\/\.,]+(\d{2,4}))?/)
  if (dmyText && monthMap[dmyText[2]]) {
    let year = dmyText[3] || String(new Date().getFullYear())
    if (year.length === 2) year = '20' + year
    return `${year}-${monthMap[dmyText[2]]}-${dmyText[1].padStart(2, '0')}`
  }

  // Handle YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`

  // Handle DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmYMatch = clean.match(/(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})/)
  if (dmYMatch) return `${dmYMatch[3]}-${dmYMatch[2].padStart(2, '0')}-${dmYMatch[1].padStart(2, '0')}`

  // Handle DD/MM/YY
  const dmyShort = clean.match(/(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{2})\b/)
  if (dmyShort) return `20${dmyShort[3]}-${dmyShort[2].padStart(2, '0')}-${dmyShort[1].padStart(2, '0')}`

  return new Date().toISOString().split('T')[0]
}

// ─── Client-Side Payslip Parser ──────────────────────────────────────────────
function extractPayslipFromText(rawText) {
  if (!rawText) return null
  const lower = rawText.toLowerCase()
  const payslipIndicators = ['payslip', 'pay slip', 'salary advice', 'basic salary', 'basic pay', 'gross pay', 'net pay', 'nett pay', 'paye', 'uif', 'earnings', 'deductions', 'remuneration']
  const matchCount = payslipIndicators.filter(k => lower.includes(k)).length
  // Do not misclassify bank statements that merely contain "salary"
  if (lower.includes('opening balance') || lower.includes('closing balance') || lower.includes('statement period')) {
    return null
  }
  if (matchCount < 3) return null

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const moneyPattern = /(?:R\s*)?(\d{1,3}(?:[\s,']\d{3})*(?:\.\d{2})|\d+\.\d{2})/g

  const dateRegex = /(\d{1,2}[\s\-\/][A-Za-z]{3,9}[\s\-\/]\d{2,4}|\d{4}[\-\/\.]\d{2}[\-\/\.]\d{2}|\d{2}[\-\/\.]\d{2}[\-\/\.]\d{2,4})/
  let payDate = new Date().toISOString().split('T')[0]
  for (const line of lines) {
    const dm = line.match(dateRegex)
    if (dm) {
      payDate = parseNativeDate(dm[0])
      break
    }
  }

  const extractLineAmount = (keywords) => {
    for (const line of lines) {
      const l = line.toLowerCase()
      if (keywords.some(k => l.includes(k))) {
        const matches = [...line.matchAll(moneyPattern)]
        if (matches.length > 0) {
          const val = parseFloat(matches[matches.length - 1][1].replace(/[\s,']/g, ''))
          if (!isNaN(val) && val > 0) return val
        }
      }
    }
    return 0
  }

  const grossPay = extractLineAmount(['gross pay', 'gross salary', 'total earnings', 'basic salary', 'basic pay'])
  const netPay = extractLineAmount(['net pay', 'nett pay', 'net salary', 'nett salary', 'take home'])
  const payeTax = extractLineAmount(['paye', 'income tax', 'tax paid'])
  const uif = extractLineAmount(['uif', 'unemployment'])
  const medicalAid = extractLineAmount(['medical aid', 'discovery health', 'bonitas', 'medihelp', 'medical scheme'])
  const retirementAnnuity = extractLineAmount(['retirement', 'pension', 'provident fund', 'ra contribution'])
  const loanDeduction = extractLineAmount(['staff loan', 'garnishee', 'loan deduction', 'salary advance'])

  const transactions = []
  const primaryIncome = netPay > 0 ? netPay : grossPay
  if (primaryIncome > 0) {
    transactions.push({
      date: payDate,
      description: netPay > 0 ? 'Salary (Payslip Net Pay)' : 'Salary (Payslip Gross Pay)',
      amount: primaryIncome,
      type: 'income',
      includeByDefault: true,
      taxCategory: ''
    })
  }
  if (retirementAnnuity > 0) {
    transactions.push({
      date: payDate,
      description: 'Retirement / Pension Contribution (Payslip)',
      amount: retirementAnnuity,
      type: 'expense',
      includeByDefault: true,
      taxCategory: 'Retirement Annuity (RA)'
    })
  }
  if (medicalAid > 0) {
    transactions.push({
      date: payDate,
      description: 'Medical Aid Contribution (Payslip)',
      amount: medicalAid,
      type: 'expense',
      includeByDefault: true,
      taxCategory: 'Medical'
    })
  }
  if (loanDeduction > 0) {
    transactions.push({
      date: payDate,
      description: 'Staff Loan / Garnishee Deduction (Payslip)',
      amount: loanDeduction,
      type: 'expense',
      includeByDefault: true,
      taxCategory: ''
    })
  }
  if (payeTax > 0) {
    transactions.push({
      date: payDate,
      description: 'PAYE Income Tax (Payslip)',
      amount: payeTax,
      type: 'expense',
      includeByDefault: netPay === 0,
      taxCategory: ''
    })
  }
  if (uif > 0) {
    transactions.push({
      date: payDate,
      description: 'UIF Contribution (Payslip)',
      amount: uif,
      type: 'expense',
      includeByDefault: netPay === 0,
      taxCategory: ''
    })
  }

  if (transactions.length === 0) return null

  return {
    documentType: 'payslip',
    payslipSummary: {
      employer: '',
      payDate,
      grossPay,
      netPay,
      payeTax,
      uif,
      medicalAid,
      retirementAnnuity
    },
    transactions
  }
}

// ─── Client-Side Bank Statement Text Parser (All SA Banks) ──────────────────
function extractTransactionsFromRawText(rawText) {
  if (!rawText) return []
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length >= 5)
  const allRows = []

  // Matches dates anywhere on the line: "01 Aug 2026", "1-Aug-2026", "01 Aug", "2026-08-01", "01/08/2026", "01/08/26"
  const dateRegex = /\b(\d{1,2}[\s\-\/\.]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:[\s\-\/\.,]+\d{2,4})?|\d{4}[\-\/\.]\d{2}[\-\/\.]\d{2}|\d{2}[\-\/\.]\d{2}[\-\/\.]\d{2,4})\b/i
  const moneyRegex = /([+\-]?\s*(?:R\s*)?\d{1,3}(?:[\s,']\d{3})*(?:\.\d{2})|[+\-]?\s*R\s*\d+(?:\.\d{2})?)(?:\s*(?:CR|DR|Cr|Dr|\-|\+))?/g

  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    const skipKeywords = [
      'opening balance', 'closing balance', 'brought forward', 'carried forward',
      'statement date', 'statement period', 'available balance', 'balance brought',
      'account number', 'branch code', 'page ', 'interest rate'
    ]
    if (skipKeywords.some(k => lowerLine.includes(k))) continue

    const dateMatch = line.match(dateRegex)
    if (!dateMatch) continue

    const dateStr = dateMatch[0]
    const lineWithoutDate = line.replace(dateStr, ' ')

    moneyRegex.lastIndex = 0
    const moneyMatches = [...lineWithoutDate.matchAll(moneyRegex)]
    if (moneyMatches.length === 0) continue

    const parsedAmounts = moneyMatches
      .map(m => {
        const raw = m[0]
        const isNegative = raw.includes('-') || /dr/i.test(raw)
        const isPositive = raw.includes('+') || /cr/i.test(raw)
        const clean = raw.replace(/[^0-9.]/g, '')
        return { original: raw, value: parseFloat(clean), isNegative, isPositive }
      })
      .filter(m => !isNaN(m.value) && m.value > 0.5)

    if (parsedAmounts.length === 0) continue

    // First amount is transaction amount (or second-to-last if multiple columns precede balance)
    const txAmount = parsedAmounts[0]
    let description = lineWithoutDate
    for (const amt of parsedAmounts) {
      description = description.replace(amt.original, ' ')
    }
    description = description.replace(/\s+/g, ' ').replace(/^[\-\–\|:]+|[\-\–\|:]+$/g, '').trim() || 'Bank Transaction'

    let type = 'expense'
    if (txAmount.isPositive && !txAmount.isNegative) {
      type = 'income'
    } else if (txAmount.isNegative) {
      type = 'expense'
    } else if (lowerLine.includes(' cr') || lowerLine.includes('credit') || lowerLine.includes('deposit')) {
      type = 'income'
    } else if (['salary', 'transfer from', 'inward', 'received', 'interest', 'nett pay', 'payment from'].some(k => lowerLine.includes(k))) {
      type = 'income'
    }

    allRows.push({
      date: parseNativeDate(dateStr),
      description,
      amount: Math.abs(txAmount.value),
      type
    })
  }
  return allRows
}

export default function CSVImport({ onClose, onSuccess }) {
  const [step, setStep] = useState('upload')
  const [format, setFormat] = useState('GENERIC')
  const [editedRows, setEditedRows] = useState([])
  const [payslipSummary, setPayslipSummary] = useState(null)
  const [syncTaxDeductions, setSyncTaxDeductions] = useState(true)
  const [importing, setImporting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const [scanError, setScanError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [lastFile, setLastFile] = useState(null)
  const [lastRawText, setLastRawText] = useState('')
  const [result, setResult] = useState(null)
  const fileInputRef = useRef()
  const queryClient = useQueryClient()

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await budgetsAPI.getCategories()).data,
  })
  const categories = categoriesData?.categories || []

  const { data: debtsData } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => (await debtsAPI.getAll()).data,
  })
  const debts = debtsData?.debts || []

  const { data: billsData } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => (await billsAPI.getAll()).data,
  })
  const bills = billsData?.bills || []

  const { data: savingsData } = useQuery({
    queryKey: ['savings'],
    queryFn: async () => (await savingsAPI.getAll()).data,
  })
  const savings = savingsData?.savings || []

  const { data: goalsData } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => (await goalsAPI.getAll()).data,
  })
  const goals = goalsData?.goals || []

  // Optional AI Deep Scan (used automatically for images/scanned PDFs, or on-demand via button)
  const runAIScan = async (file, rawText) => {
    const entitiesContext = { debts, bills, savings, goals, categories }
    setIsScanning(true)
    setScanError('')
    setScanStatus(`Pace AI is analyzing ${file.name}...`)

    try {
      const lowerName = (file.name || '').toLowerCase()
      const mime = (file.type || '').toLowerCase()
      const isPDF = lowerName.endsWith('.pdf') || mime === 'application/pdf'
      const isImage = /\.(png|jpg|jpeg|webp)$/i.test(lowerName) || mime.startsWith('image/')

      // Only send heavy base64 fileData if it's an image or a scanned PDF without selectable text
      let fileData = ''
      let mimeType = ''
      if (isImage || (isPDF && (!rawText || rawText.trim().length < 80))) {
        fileData = await fileToBase64(file)
        mimeType = isPDF ? 'application/pdf' : (file.type || 'image/jpeg')
      }

      const scanRes = await aiAPI.scanStatement({
        text: rawText || '',
        fileData,
        mimeType,
        fileName: file.name,
        categories
      })

      const transactions = scanRes.data?.transactions || []
      const docType = scanRes.data?.documentType || 'bank_statement'
      const summary = scanRes.data?.payslipSummary || null

      if (transactions.length === 0) {
        throw new Error('AI could not find any transactions in this document.')
      }

      const parsed = transactions.map((r, i) => {
        const matched = autoMatchEntities(r.description, r.type, entitiesContext, r)
        return {
          _id: i,
          _include: r.includeByDefault !== false,
          description: r.description || 'Imported Item',
          amount: Math.abs(parseFloat(r.amount) || 0),
          type: r.type === 'income' ? 'income' : 'expense',
          transactionDate: parseNativeDate(r.date),
          categoryId: matched.categoryId,
          linkTarget: matched.linkTarget,
          taxCategory: r.taxCategory || ''
        }
      }).filter(r => r.amount > 0)

      const autoLinkedCount = parsed.filter(p => p.linkTarget).length
      setPayslipSummary(docType === 'payslip' ? summary : null)
      setFormat(docType === 'payslip' ? 'Payslip (AI Scanned)' : 'Statement (AI Scanned)')
      setEditedRows(parsed)
      setIsScanning(false)
      setStep('preview')
      toast.success(
        docType === 'payslip'
          ? `Payslip scanned! Extracted ${parsed.length} items.`
          : autoLinkedCount > 0
            ? `Extracted ${parsed.length} transactions & auto-linked ${autoLinkedCount} debt/bill payments!`
            : `Extracted ${parsed.length} transactions!`
      )
      return true
    } catch (err) {
      setIsScanning(false)
      throw err
    }
  }

  const processSelectedFile = async (file) => {
    if (!file) return
    setScanError('')
    setIsScanning(true)
    setPayslipSummary(null)
    setLastFile(file)
    setScanStatus(`Opening ${file.name || 'document'}...`)

    const lowerName = (file.name || '').toLowerCase()
    const mime = (file.type || '').toLowerCase()

    // Detect PDF even on mobile where file.type may be empty or application/octet-stream
    let isPDF = lowerName.endsWith('.pdf') || mime === 'application/pdf'
    const isCSV = lowerName.endsWith('.csv') || mime === 'text/csv' || mime === 'application/vnd.ms-excel'
    const isImage = /\.(png|jpg|jpeg|webp|heic)$/i.test(lowerName) || mime.startsWith('image/')

    if (!isPDF && !isCSV && !isImage) {
      try {
        const headerBytes = new Uint8Array(await file.slice(0, 5).arrayBuffer())
        const headerStr = String.fromCharCode(...headerBytes)
        if (headerStr.startsWith('%PDF')) {
          isPDF = true
        }
      } catch {
        // ignore slice check error
      }
    }

    if (!isPDF && !isCSV && !isImage) {
      setIsScanning(false)
      const msg = 'Unsupported file format. Please upload a PDF, CSV, or Image (.png / .jpg) of your bank statement or payslip.'
      setScanError(msg)
      toast.error(msg)
      return
    }

    const entitiesContext = { debts, bills, savings, goals, categories }

    try {
      // ─── 1. CSV FAST PATH (Instant < 0.2s) ─────────────────────────────────
      if (isCSV) {
        setScanStatus(`Parsing CSV ${file.name}...`)
        const rawText = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (ev) => resolve(String(ev.target.result || ''))
          reader.onerror = (err) => reject(err)
          reader.readAsText(file)
        })
        setLastRawText(rawText)

        const { headers, rows } = parseCSV(rawText)
        const detectedFormat = detectBankFormat(headers)
        const parsed = rows
          .map(row => parseRow(row, headers, detectedFormat))
          .filter(r => r._valid && r.amount > 0)

        if (parsed.length > 0) {
          const enriched = parsed.map((r, i) => {
            const matched = autoMatchEntities(r.description, r.type, entitiesContext)
            return {
              ...r,
              _id: i,
              _include: true,
              categoryId: matched.categoryId,
              linkTarget: matched.linkTarget,
              taxCategory: ''
            }
          })
          const autoLinkedCount = enriched.filter(p => p.linkTarget).length
          setFormat(detectedFormat)
          setEditedRows(enriched)
          setIsScanning(false)
          setStep('preview')
          toast.success(
            autoLinkedCount > 0
              ? `Extracted ${enriched.length} transactions & auto-linked ${autoLinkedCount} debt/bill payments!`
              : `Extracted ${enriched.length} transactions from CSV!`
          )
          return
        }

        // If unusual CSV structure, fallback to AI
        await runAIScan(file, rawText)
        return
      }

      // ─── 2. PDF FAST PATH (Instant local scan first, AI fallback for scanned PDFs) ───
      if (isPDF) {
        setScanStatus(`Reading PDF ${file.name}...`)
        const rawText = await extractRawTextFromPDF(file)
        setLastRawText(rawText)

        if (rawText && rawText.trim().length > 20) {
          // 2a. Check if it's a Payslip first
          const payslipResult = extractPayslipFromText(rawText)
          if (payslipResult && payslipResult.transactions.length > 0) {
            const parsed = payslipResult.transactions.map((r, i) => {
              const matched = autoMatchEntities(r.description, r.type, entitiesContext)
              return {
                _id: i,
                _include: r.includeByDefault !== false,
                description: r.description,
                amount: r.amount,
                type: r.type,
                transactionDate: r.date,
                categoryId: matched.categoryId,
                linkTarget: matched.linkTarget,
                taxCategory: r.taxCategory || ''
              }
            })
            setPayslipSummary(payslipResult.payslipSummary)
            setFormat('Payslip (Smart Scan)')
            setEditedRows(parsed)
            setIsScanning(false)
            setStep('preview')
            toast.success(`Payslip scanned! Extracted ${parsed.length} salary & deduction items.`)
            return
          }

          // 2b. Otherwise parse as Bank Statement
          const pdfRows = extractTransactionsFromRawText(rawText)
          if (pdfRows.length > 0) {
            const parsed = pdfRows.map((r, i) => {
              const matched = autoMatchEntities(r.description, r.type, entitiesContext)
              return {
                _id: i,
                _include: true,
                description: r.description,
                amount: r.amount,
                type: r.type,
                transactionDate: r.date,
                categoryId: matched.categoryId,
                linkTarget: matched.linkTarget,
                taxCategory: ''
              }
            })
            const autoLinkedCount = parsed.filter(p => p.linkTarget).length
            setFormat('PDF Statement (Smart Scan)')
            setEditedRows(parsed)
            setIsScanning(false)
            setStep('preview')
            toast.success(
              autoLinkedCount > 0
                ? `Extracted ${parsed.length} transactions & auto-linked ${autoLinkedCount} debt/bill payments!`
                : `Extracted ${parsed.length} transactions from PDF!`
            )
            return
          }
        }

        // 2c. If PDF is scanned (image-only) or has an unusual layout, use AI Multimodal fallback
        await runAIScan(file, rawText)
        return
      }

      // ─── 3. IMAGE PATH (Screenshot / Photo of Payslip or Statement) ────────
      if (isImage) {
        await runAIScan(file, '')
        return
      }
    } catch (err) {
      console.error('Import error:', err)
      setIsScanning(false)
      const message = err.response?.data?.error || err.message || 'Could not extract transactions from this document.'
      setScanError(message)
      toast.error(message)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  const handleImport = async () => {
    const selectedRows = editedRows.filter(r => r._include)
    const toImport = selectedRows.map(r => {
      const [linkType, linkId] = (r.linkTarget || '').split(':')
      const parsedId = linkId ? parseInt(linkId) : null
      return {
        type: r.type,
        amount: r.amount,
        description: r.description,
        transactionDate: r.transactionDate,
        categoryId: r.categoryId ? parseInt(r.categoryId) : null,
        debtId: linkType === 'debt' ? parsedId : null,
        billId: linkType === 'bill' ? parsedId : null,
        savingsId: linkType === 'savings' ? parsedId : null,
        goalId: linkType === 'goal' ? parsedId : null,
      }
    })

    if (toImport.length === 0) {
      toast.error('Select at least one item to import')
      return
    }

    setImporting(true)
    try {
      const res = await importAPI.importTransactions(toImport)

      let taxLoggedCount = 0
      if (syncTaxDeductions) {
        const taxRows = selectedRows.filter(r => r.taxCategory && r.amount > 0)
        for (const tr of taxRows) {
          try {
            await taxAPI.createDeduction({
              description: tr.description,
              amount: parseFloat(tr.amount),
              category: tr.taxCategory,
              date: tr.transactionDate,
              receipt: 'Auto-logged from Payslip Import'
            })
            taxLoggedCount++
          } catch (taxErr) {
            console.warn('Tax deduction auto-log skipped:', taxErr.message)
          }
        }
        if (taxLoggedCount > 0) {
          queryClient.invalidateQueries({ queryKey: ['tax-deductions'] })
          queryClient.invalidateQueries({ queryKey: ['tax-summary'] })
        }
      }

      setResult({
        imported: res.data.imported,
        failed: res.data.failed || 0,
        debtsUpdated: res.data.debtsUpdated || 0,
        billsPaid: res.data.billsPaid || 0,
        savingsUpdated: res.data.savingsUpdated || 0,
        goalsUpdated: res.data.goalsUpdated || 0,
        taxLoggedCount
      })
      setStep('done')
      toast.success(`Successfully imported ${res.data.imported} item(s)!`)
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
  const hasTaxDeductibleRows = editedRows.some(r => r.taxCategory && r._include)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Import Bank Statement or Payslip</h2>
            <p className="section-subtitle">Upload a CSV, PDF, or photo/screenshot of your bank statement or payslip</p>
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
            <label
              htmlFor="pace-statement-file-input"
              className="upload-area"
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!isDragging) setIsDragging(true)
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragging(false)
              }}
              onDrop={handleDrop}
              style={{
                display: 'block',
                position: 'relative',
                borderColor: isDragging ? '#10b981' : isScanning ? '#4f8cff' : undefined,
                background: isDragging ? 'rgba(16, 185, 129, 0.08)' : isScanning ? 'rgba(79, 140, 255, 0.06)' : undefined,
                cursor: isScanning ? 'wait' : 'pointer'
              }}
            >
              {isScanning ? (
                <div style={{ padding: '1rem 0' }}>
                  <Loader2 size={48} className="upload-icon" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Scanning Your Document...</h3>
                  <p style={{ color: '#38bdf8', fontWeight: 600 }}>{scanStatus || 'Processing document...'}</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    Matching transactions, payslip figures, debts & bills automatically
                  </p>
                </div>
              ) : (
                <>
                  <Upload size={48} className="upload-icon" />
                  <h3>Tap or Drop your Bank Statement or Payslip</h3>
                  <p>Supports <strong>PDF</strong>, <strong>CSV</strong>, and <strong>Images (PNG/JPG)</strong></p>
                  <div className="supported-banks">
                    <FileText size={16} /> <span>FNB • Capitec • Standard Bank • Nedbank • ABSA • SA Payslips</span>
                  </div>

                  <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="btn primary small" style={{ pointerEvents: 'none' }}>
                      <Upload size={15} /> Choose File to Upload
                    </span>
                  </div>
                </>
              )}

              <input
                id="pace-statement-file-input"
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf,.png,.jpg,.jpeg,.webp,application/pdf,text/csv,image/*"
                onChange={handleFileChange}
                disabled={isScanning}
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  opacity: 0,
                  overflow: 'hidden',
                  zIndex: -1
                }}
              />
            </label>

            {scanError && (
              <div
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left',
                  fontSize: '0.88rem'
                }}
              >
                <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>Could not scan file</strong>
                  {scanError}
                </div>
                <label
                  htmlFor="pace-statement-file-input"
                  className="btn ghost small"
                  style={{ cursor: 'pointer', margin: 0 }}
                >
                  Try Another File
                </label>
              </div>
            )}

            <div className="import-tips">
              <h4>💡 What You Can Upload:</h4>
              <ul>
                <li><strong>Bank Statements (PDF / CSV / Screenshot):</strong> Automatically categorizes expenses and deducts payments made toward your Debts or Bills.</li>
                <li><strong>Payslips (PDF / Photo):</strong> Automatically extracts your Net Salary, Retirement Annuity (RA), Medical Aid, and deductions, and can sync tax-deductible items straight to your SARS Tax Hub.</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="import-preview">
            {payslipSummary && (
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(79, 140, 255, 0.08) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase' }}>
                    <Sparkles size={15} /> Payslip Intelligence Summary {payslipSummary.employer ? `• ${payslipSummary.employer}` : ''}
                  </span>
                  {hasTaxDeductibleRows && (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#e2e8f0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={syncTaxDeductions}
                        onChange={(e) => setSyncTaxDeductions(e.target.checked)}
                      />
                      <ShieldCheck size={14} color="#10b981" /> Also log RA / Medical Aid to SARS Tax Hub
                    </label>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
                  {payslipSummary.grossPay > 0 && (
                    <div><span className="text-muted">Gross Pay:</span> <strong style={{ color: '#fff' }}>R{Number(payslipSummary.grossPay).toLocaleString()}</strong></div>
                  )}
                  {payslipSummary.netPay > 0 && (
                    <div><span className="text-muted">Net Pay:</span> <strong style={{ color: '#10b981' }}>R{Number(payslipSummary.netPay).toLocaleString()}</strong></div>
                  )}
                  {payslipSummary.payeTax > 0 && (
                    <div><span className="text-muted">PAYE Tax:</span> <strong style={{ color: '#f87171' }}>R{Number(payslipSummary.payeTax).toLocaleString()}</strong></div>
                  )}
                  {payslipSummary.uif > 0 && (
                    <div><span className="text-muted">UIF:</span> <strong style={{ color: '#cbd5e1' }}>R{Number(payslipSummary.uif).toLocaleString()}</strong></div>
                  )}
                  {payslipSummary.retirementAnnuity > 0 && (
                    <div><span className="text-muted">RA / Pension:</span> <strong style={{ color: '#38bdf8' }}>R{Number(payslipSummary.retirementAnnuity).toLocaleString()}</strong></div>
                  )}
                  {payslipSummary.medicalAid > 0 && (
                    <div><span className="text-muted">Medical Aid:</span> <strong style={{ color: '#38bdf8' }}>R{Number(payslipSummary.medicalAid).toLocaleString()}</strong></div>
                  )}
                </div>
              </div>
            )}

            <div className="preview-header">
              <div>
                <span className="bank-badge">{format}</span>
                <span className="preview-count">{selectedCount} of {editedRows.length} selected</span>
              </div>
              <div className="preview-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {lastFile && (
                  <button
                    className="btn ghost small"
                    disabled={isScanning}
                    onClick={async () => {
                      try {
                        await runAIScan(lastFile, lastRawText)
                      } catch (err) {
                        toast.error(err.response?.data?.error || 'AI service is busy right now — using Smart Scan results.')
                      }
                    }}
                    title="Re-analyze document with Pace AI"
                  >
                    <Sparkles size={14} /> {isScanning ? 'AI Scanning...' : 'Enhance with AI'}
                  </button>
                )}
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
                    <th>Auto-Link (Debt / Bill / Pot)</th>
                  </tr>
                </thead>
                <tbody>
                  {editedRows.map(row => (
                    <tr key={row._id} className={!row._include ? 'row-excluded' : ''}>
                      <td><input type="checkbox" checked={row._include} onChange={e => updateRow(row._id, '_include', e.target.checked)} /></td>
                      <td className="date-cell">{row.transactionDate}</td>
                      <td>
                        <input className="inline-edit" value={row.description} onChange={e => updateRow(row._id, 'description', e.target.value)} />
                        {row.taxCategory && (
                          <span style={{ display: 'inline-block', marginLeft: '6px', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                            SARS: {row.taxCategory}
                          </span>
                        )}
                      </td>
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
                      <td>
                        <select
                          className="inline-select"
                          value={row.linkTarget || ''}
                          onChange={e => updateRow(row._id, 'linkTarget', e.target.value)}
                          style={
                            row.linkTarget
                              ? { borderColor: '#10b981', color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.08)' }
                              : undefined
                          }
                        >
                          <option value="">None</option>
                          {debts.filter(d => parseFloat(d.balance) > 0).length > 0 && (
                            <optgroup label="💳 Pay Off Debt">
                              {debts.filter(d => parseFloat(d.balance) > 0).map(d => (
                                <option key={`debt:${d.id}`} value={`debt:${d.id}`}>
                                  💳 Debt: {d.name} (R{parseFloat(d.balance).toLocaleString()})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {bills.filter(b => !b.is_paid).length > 0 && (
                            <optgroup label="📅 Mark Bill Paid">
                              {bills.filter(b => !b.is_paid).map(b => (
                                <option key={`bill:${b.id}`} value={`bill:${b.id}`}>
                                  📅 Bill: {b.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {savings.length > 0 && (
                            <optgroup label="🏦 Savings Pot">
                              {savings.map(s => (
                                <option key={`savings:${s.id}`} value={`savings:${s.id}`}>
                                  🏦 Pot: {s.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {goals.filter(g => !g.is_achieved).length > 0 && (
                            <optgroup label="🎯 Financial Goal">
                              {goals.filter(g => !g.is_achieved).map(g => (
                                <option key={`goal:${g.id}`} value={`goal:${g.id}`}>
                                  🎯 Goal: {g.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
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
                {importing ? 'Importing...' : `Import ${selectedCount} Item${selectedCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="import-done">
            <CheckCircle size={64} className="import-success-icon" />
            <h3>Import Complete!</h3>
            <p>Successfully imported <strong>{result.imported}</strong> transaction(s).</p>
            {(result.debtsUpdated > 0 || result.billsPaid > 0 || result.savingsUpdated > 0 || result.goalsUpdated > 0 || result.taxLoggedCount > 0) && (
              <div style={{ margin: '1rem auto', padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10b981', fontSize: '0.9rem' }}>
                ⚡ <strong>Auto-Synced Balances:</strong>{' '}
                {[
                  result.debtsUpdated > 0 && `${result.debtsUpdated} Debt payment(s) deducted`,
                  result.billsPaid > 0 && `${result.billsPaid} Bill(s) marked paid`,
                  result.savingsUpdated > 0 && `${result.savingsUpdated} Savings Pot(s) updated`,
                  result.goalsUpdated > 0 && `${result.goalsUpdated} Goal(s) progressed`,
                  result.taxLoggedCount > 0 && `${result.taxLoggedCount} SARS Tax Deduction(s) logged`,
                ].filter(Boolean).join(' • ')}
              </div>
            )}
            <button className="btn primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
