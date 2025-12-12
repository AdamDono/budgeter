# 🚀 Budgeter - Quick Start Guide

## ⚡ Get Running in 5 Minutes

### Step 1: Setup Database (2 min)

```bash
cd backend
npm run setup-db
```

✅ This creates all tables including:
- debts
- tax_deductions
- budget_tips
- tip_likes
- tip_comments

### Step 2: Start Backend (1 min)

```bash
npm start
# Server runs on http://localhost:3001
```

### Step 3: Start Frontend (1 min)

```bash
# In root directory
npm run dev
# App runs on http://localhost:5173
```

### Step 4: Login & Test (1 min)

1. Go to http://localhost:5173
2. Register a new account
3. Login
4. Test the new features!

---

## 🎯 New Features to Test

### 1. **Debt Management** (`/debt`)
- ✅ Add debts (credit cards, loans, etc.)
- ✅ Choose Snowball or Avalanche payoff method
- ✅ See payoff timeline and interest calculations

### 2. **Tax Planning** (`/tax`)
- ✅ Track deductible expenses
- ✅ See tax savings calculation
- ✅ Filter by tax year and category

### 3. **Budget Tips** (`/tips`)
- ✅ View community budget tips
- ✅ Filter by category
- ✅ Save/like tips
- ✅ Share tips

### 4. **Spending Trends** (`/trends`)
- ✅ View spending patterns
- ✅ See monthly forecast
- ✅ Category trends
- ✅ Smart insights

### 5. **Recurring Transactions** (`/recurring`)
- ✅ Set up salary/recurring income
- ✅ Auto-create transactions
- ✅ Track upcoming payments

---

## 🐛 Troubleshooting

### Database Error?
```bash
# Make sure PostgreSQL is running
psql --version

# If not installed:
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: Download from postgresql.org
```

### Port Already in Use?
```bash
# Backend on different port
PORT=3002 npm start

# Frontend on different port
npm run dev -- --port 5174
```

### Tables Not Created?
```bash
# Check database exists
psql -l | grep budgeter_db

# If not, create it
createdb budgeter_db

# Then run setup
npm run setup-db
```

### API Connection Error?
```bash
# Check backend is running
curl http://localhost:3001/api/auth/health

# Check frontend .env has correct API URL
cat .env | grep VITE_API_URL
```

---

## 📊 Database Check

```bash
# Connect to database
psql -U your_username -d budgeter_db

# List all tables
\dt

# Check debts table
SELECT * FROM debts;

# Check tax_deductions table
SELECT * FROM tax_deductions;

# Check budget_tips table
SELECT * FROM budget_tips;
```

---

## 🎨 Features Overview

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Dashboard | `/dashboard` | ✅ | Monthly filtering |
| Transactions | `/transactions` | ✅ | Monthly view |
| Goals | `/goals` | ✅ | Track savings |
| Analytics | `/analytics` | ✅ | Full insights |
| **Recurring** | **/recurring** | ✨ NEW | Auto-create |
| **Trends** | **/trends** | ✨ NEW | Forecasting |
| **Debt** | **/debt** | ✨ NEW | Payoff calc |
| **Tax** | **/tax** | ✨ NEW | Deductions |
| **Tips** | **/tips** | ✨ NEW | Community |
| Settings | `/settings` | ✅ | User prefs |

---

## 📝 Test Checklist

- [ ] Database setup successful
- [ ] Backend server running
- [ ] Frontend loads
- [ ] Can login/register
- [ ] Can add debt
- [ ] Can add tax deduction
- [ ] Can view tips
- [ ] Can view trends
- [ ] Can add recurring transaction
- [ ] No console errors

---

## 🚀 Next Steps

1. ✅ Setup complete
2. Test each feature
3. Check TESTING_GUIDE.md for detailed tests
4. Review SETUP_GUIDE.md for full documentation
5. Deploy to production

---

## 📞 Need Help?

1. Check DATABASE_SETUP.md for database issues
2. Check SETUP_GUIDE.md for full documentation
3. Check TESTING_GUIDE.md for feature testing
4. Check browser console for errors
5. Check backend logs for API errors

---

## 🎉 You're All Set!

Your Budgeter app is now ready with:
- ✅ 5 new advanced features
- ✅ Complete backend API
- ✅ Beautiful UI styling
- ✅ Database tables
- ✅ Error handling
- ✅ Validation

**Happy budgeting! 💰**

