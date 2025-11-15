# Budgeter (No Backend)

A clean, responsive budget tracker built with React + Vite. Data is stored in your browser via localStorage.

## Features
- Add budget categories with optional monthly limits
- Add income and expense transactions with date and note
- Month/category/type/search filters
- Overview summary (Income, Expenses, Net)
- Per-category progress vs limit
- Export/Import data as JSON
- Dark, responsive UI

## Tech
- React 18 + Vite
- No backend, no CSS framework

## Run locally
```bash
npm install
npm run dev
```
Open the URL shown (typically http://localhost:5173).

## Project structure
- `index.html`
- `src/main.jsx`
- `src/App.jsx`
- `src/components/`
  - `BudgetForm.jsx`
  - `TransactionForm.jsx`
  - `Filters.jsx`
  - `TransactionList.jsx`
  - `Summary.jsx`
  - `ExportImport.jsx`
- `src/utils/`
  - `storage.js`
  - `format.js`
- `src/styles.css`

## Notes
- Data key: `budgeter_v1` in `localStorage`.
- No backend now; easy to add later (e.g., Supabase/Firebase/Express).
