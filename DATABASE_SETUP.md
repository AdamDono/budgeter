# Database Setup Instructions

## 🚀 Quick Setup

### Option 1: Automatic Setup (Recommended)

```bash
cd backend
npm run setup-db
```

This will:
- Create all tables
- Create all indexes
- Insert default data
- Skip if tables already exist

### Option 2: Manual Setup with psql

```bash
# Connect to your database
psql -U your_username -d budgeter_db

# Run the schema file
\i database/schema.sql
```

### Option 3: Manual Setup with SQL File

```bash
psql -U your_username -d budgeter_db -f backend/database/schema.sql
```

---

## 📋 Tables Created

### Core Tables (Existing)
- `users` - User accounts
- `accounts` - Bank/savings accounts
- `budget_categories` - Spending categories
- `transactions` - Income/expense transactions
- `goals` - Financial goals
- `recurring_transactions` - Recurring income/expenses

### New Tables ✨
- `debts` - Debt tracking (credit cards, loans, etc.)
- `tax_deductions` - Tax deductible expenses
- `budget_tips` - Community budget tips
- `tip_likes` - Likes on tips
- `tip_comments` - Comments on tips

---

## 🔍 Verify Setup

### Check if tables exist:

```bash
psql -U your_username -d budgeter_db

# List all tables
\dt

# Check specific table
\d debts
\d tax_deductions
\d budget_tips
```

### Expected output:
```
                 List of relations
 Schema |        Name        | Type  | Owner
--------+--------------------+-------+-------
 public | accounts           | table | user
 public | budget_categories  | table | user
 public | budget_tips        | table | user
 public | debts              | table | user
 public | goals              | table | user
 public | notifications      | table | user
 public | recurring_trans... | table | user
 public | tax_deductions     | table | user
 public | tip_comments       | table | user
 public | tip_likes          | table | user
 public | transactions       | table | user
 public | user_settings      | table | user
 public | users              | table | user
```

---

## 🆘 Troubleshooting

### Error: "database does not exist"

```bash
# Create database first
createdb budgeter_db

# Then run setup
npm run setup-db
```

### Error: "permission denied"

```bash
# Check PostgreSQL user permissions
psql -U postgres

# Create user with permissions
CREATE USER your_user WITH PASSWORD 'your_password';
ALTER USER your_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE budgeter_db TO your_user;
```

### Error: "relation already exists"

This is normal! The script will skip existing tables.

### Error: "JSONB type not supported"

Make sure you have PostgreSQL 9.4+ installed.

```bash
psql --version
```

---

## 🔄 Reset Database

### ⚠️ WARNING: This will delete all data!

```bash
# Drop all tables
psql -U your_username -d budgeter_db

DROP TABLE IF EXISTS tip_comments CASCADE;
DROP TABLE IF EXISTS tip_likes CASCADE;
DROP TABLE IF EXISTS budget_tips CASCADE;
DROP TABLE IF EXISTS tax_deductions CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS bill_reminders CASCADE;
DROP TABLE IF EXISTS recurring_transactions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS budget_categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS account_types CASCADE;
DROP TABLE IF EXISTS users CASCADE;

# Then run setup again
npm run setup-db
```

---

## 📊 Database Schema

### debts
```sql
id (PK) | user_id (FK) | name | balance | interest_rate | monthly_payment | type | created_at | updated_at
```

### tax_deductions
```sql
id (PK) | user_id (FK) | description | amount | category | date | receipt | created_at | updated_at
```

### budget_tips
```sql
id (PK) | user_id (FK) | title | description | category | details (JSONB) | is_published | created_at | updated_at
```

### tip_likes
```sql
id (PK) | tip_id (FK) | user_id (FK) | created_at | UNIQUE(tip_id, user_id)
```

### tip_comments
```sql
id (PK) | tip_id (FK) | user_id (FK) | comment | created_at | updated_at
```

---

## ✅ Verification Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created: `budgeter_db`
- [ ] User has permissions
- [ ] Run `npm run setup-db`
- [ ] All tables created
- [ ] No errors in console
- [ ] Backend server starts
- [ ] Frontend connects to API

---

## 🚀 Next Steps

1. ✅ Database setup complete
2. Start backend: `npm start`
3. Start frontend: `npm run dev`
4. Test features in browser
5. Check console for errors

