import React, { useRef } from 'react'

export default function ExportImport({ data, onImport }) {
  const fileRef = useRef(null)

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'budgeter-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importJson(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (parsed && parsed.budgets && parsed.transactions) {
          onImport(parsed)
        } else {
          alert('Invalid file format')
        }
      } catch (err) {
        alert('Invalid JSON')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="row gap">
      <button className="btn ghost" onClick={exportJson}>Export</button>
      <input type="file" accept="application/json" hidden ref={fileRef} onChange={importJson} />
      <button className="btn" onClick={() => fileRef.current?.click()}>Import</button>
    </div>
  )
}
