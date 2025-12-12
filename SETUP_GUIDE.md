# Budgeter - Complete Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Git

### 1. Database Setup

Run the migrations to create new tables:

```bash
cd backend
psql -U your_user -d budgeter_db -f database/schema.sql
psql -U your_user -d budgeter_db -f database/migrations.sql
```

### 2. Backend Setup

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:3001`

### 3. Frontend Setup

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## 📋 New Features Overview

### 1. **Recurring Transactions** (`/recurring`)
- Set up automatic salary, rent, subscriptions
- Snowball & avalanche payoff strategies
- Auto-create transactions daily at 6 AM

**API Endpoints:**
```
GET    /api/recurring              - Get all recurring transactions
POST   /api/recurring              - Create new recurring
PUT    /api/recurring/:id          - Update recurring
DELETE /api/recurring/:id          - Delete recurring
POST   /api/recurring/:id/execute  - Execute transaction
GET    /api/recurring/upcoming     - Get upcoming (7 days)
GET    /api/recurring/overdue      - Get overdue
```

### 2. **Spending Trends & Forecasts** (`/trends`)
- Analyze spending patterns
- Monthly forecasting
- Category trends
- Smart insights

**Features:**
- Daily spending visualization
- Trend comparison (up/down %)
- Forecasted monthly spending
- Category-specific trends

### 3. **Debt Management** (`/debt`)
- Track multiple debts
- Snowball method (pay smallest first)
- Avalanche method (pay highest interest first)
- Payoff timeline calculator

**API Endpoints:**
```
GET    /api/debts                        - Get all debts
POST   /api/debts                        - Create debt
PUT    /api/debts/:id                    - Update debt
DELETE /api/debts/:id                    - Delete debt
POST   /api/debts/calculate/payoff       - Calculate payoff plan
```

### 4. **Tax Planning & Deductions** (`/tax`)
- Track deductible expenses
- 8 categories (Medical, Education, Home Office, etc.)
- Tax savings calculator
- SA-specific tax tips

**API Endpoints:**
```
GET    /api/taxes                        - Get deductions
POST   /api/taxes                        - Create deduction
PUT    /api/taxes/:id                    - Update deduction
DELETE /api/taxes/:id                    - Delete deduction
GET    /api/taxes/summary/:year          - Get tax summary
```

### 5. **Budget Tips** (`/tips`)
- Community budget tips platform
- 5 categories (Saving, Budgeting, Investing, Debt, Lifestyle)
- Like & comment on tips
- Share tips

**API Endpoints:**
```
GET    /api/tips                         - Get all tips
GET    /api/tips/user/my-tips            - Get user's tips
POST   /api/tips                         - Create tip
PUT    /api/tips/:id                     - Update tip
DELETE /api/tips/:id                     - Delete tip
POST   /api/tips/:id/like                - Like/unlike tip
POST   /api/tips/:id/comment             - Add comment
GET    /api/tips/:id/comments            - Get comments
```

---

## 🗄️ Database Schema

### New Tables Created:

**debts**
```sql
- id (PK)
- user_id (FK)
- name
- balance
- interest_rate
- monthly_payment
- type (credit-card, personal-loan, student-loan, mortgage, other)
- created_at, updated_at
```

**tax_deductions**
```sql
- id (PK)
- user_id (FK)
- description
- amount
- category
- date
- receipt
- created_at, updated_at
```

**budget_tips**
```sql
- id (PK)
- user_id (FK)
- title
- description
- category (saving, budgeting, investing, debt, lifestyle)
- details (JSONB)
- is_published
- created_at, updated_at
```

**tip_likes**
```sql
- id (PK)
- tip_id (FK)
- user_id (FK)
- created_at
```

**tip_comments**
```sql
- id (PK)
- tip_id (FK)
- user_id (FK)
- comment
- created_at, updated_at
```

---

## 🎨 Styling

All new pages use the comprehensive CSS in `src/styles/new-pages.css`:

- **Responsive design** - Works on mobile, tablet, desktop
- **Dark theme** - Matches existing design
- **Consistent components** - Cards, buttons, forms
- **Animations** - Smooth transitions and hover effects

### CSS Classes:
- `.metrics-grid` - Metric cards layout
- `.debt-card` - Debt display cards
- `.category-trends` - Category trend items
- `.tips-grid` - Tips grid layout
- `.strategy-btn` - Strategy selector buttons

---

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/budgeter_db
JWT_SECRET=your_secret_key
NODE_ENV=development
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:3001/api
```

---

## 📱 API Client Usage

All endpoints are available through the API client:

```javascript
import { debtsAPI, taxAPI, tipsAPI } from '../lib/api'

// Debts
const debts = await debtsAPI.getAll()
await debtsAPI.create({ name: 'Credit Card', balance: 5000, ... })
await debtsAPI.calculatePayoff('snowball')

// Tax
const deductions = await taxAPI.getDeductions(2024)
const summary = await taxAPI.getSummary(2024, 28)

// Tips
const tips = await tipsAPI.getAll('saving')
await tipsAPI.create({ title: '...', description: '...', ... })
await tipsAPI.like(tipId)
```

---

## 🧪 Testing

### Test Debt Payoff Calculator
1. Go to `/debt`
2. Add multiple debts
3. Switch between Snowball/Avalanche
4. Verify payoff timeline updates

### Test Tax Deductions
1. Go to `/tax`
2. Add deductions in different categories
3. Change tax year and rate
4. Verify tax savings calculation

### Test Budget Tips
1. Go to `/tips`
2. Filter by category
3. Share a tip
4. Like/comment on tips

### Test Trends
1. Go to `/trends`
2. View spending patterns
3. Check forecasted spending
4. Verify category trends

---

## 🚀 Deployment

### Frontend (Netlify)
```bash
npm run build
# Deploy dist/ folder to Netlify
```

### Backend (Heroku/Railway)
```bash
git push heroku main
# Or use Railway dashboard
```

### Database
- Use managed PostgreSQL (AWS RDS, Railway, Heroku Postgres)
- Run migrations on deployment

---

## 📊 Performance Tips

1. **Database Indexes** - Already created on user_id, date, category
2. **Query Optimization** - Use pagination for large datasets
3. **Caching** - React Query handles caching automatically
4. **Lazy Loading** - Pages load on demand

---

## 🐛 Troubleshooting

### Database Connection Error
```
Check DATABASE_URL in .env
Ensure PostgreSQL is running
Verify user permissions
```

### API Not Found
```
Ensure backend server is running on port 3001
Check VITE_API_URL in frontend .env
Verify routes are registered in server.js
```

### Styling Issues
```
Clear browser cache
Rebuild CSS: npm run build
Check new-pages.css is imported in styles.css
```

### Missing Tables
```
Run migrations: psql -f database/migrations.sql
Check table creation: \dt in psql
Verify user_id foreign keys
```

---

## 📚 File Structure

```
budgeter/
├── backend/
│   ├── routes/
│   │   ├── debts.js          ✅ NEW
│   │   ├── taxes.js          ✅ NEW
│   │   ├── tips.js           ✅ NEW
│   │   └── ... (existing)
│   ├── database/
│   │   ├── schema.sql
│   │   └── migrations.sql    ✅ NEW
│   └── server.js             ✅ UPDATED
├── src/
│   ├── pages/
│   │   ├── Recurring.jsx     ✅ NEW
│   │   ├── Trends.jsx        ✅ NEW
│   │   ├── Debt.jsx          ✅ NEW
│   │   ├── Tax.jsx           ✅ NEW
│   │   ├── Tips.jsx          ✅ NEW
│   │   └── ... (existing)
│   ├── lib/
│   │   └── api.js            ✅ UPDATED
│   ├── styles/
│   │   └── new-pages.css     ✅ NEW
│   ├── components/
│   │   └── Layout.jsx        ✅ UPDATED
│   └── App.jsx               ✅ UPDATED
└── ...
```

---

## ✅ Checklist

- [x] Backend API endpoints created
- [x] Frontend pages created
- [x] Database migrations ready
- [x] CSS styling complete
- [x] API client updated
- [x] Navigation integrated
- [x] Error handling added
- [x] Loading states added
- [x] Responsive design
- [x] Documentation complete

---

## 🎯 Next Steps

1. **Run database migrations**
2. **Start backend server**
3. **Start frontend dev server**
4. **Test each feature**
5. **Deploy to production**

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Review API documentation
3. Check browser console for errors
4. Verify database connection
5. Check backend logs

---

## 📄 License

MIT License - See LICENSE file

