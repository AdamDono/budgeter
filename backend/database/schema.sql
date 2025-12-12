-- Budgeter Database Schema for South African Finance App

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  id_number VARCHAR(13), -- SA ID number
  profile_picture TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account types (Checking, Savings, Credit Card, Investment)
CREATE TABLE account_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(50)
);

-- User accounts (multiple accounts per user)
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  account_type_id INTEGER REFERENCES account_types(id),
  name VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  balance DECIMAL(15,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'ZAR',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget categories
CREATE TABLE budget_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7), -- hex color
  monthly_limit DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial goals
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0.00,
  target_date DATE,
  priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
  is_achieved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES budget_categories(id),
  goal_id INTEGER REFERENCES goals(id), -- for goal contributions
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  receipt_url TEXT, -- uploaded receipt image
  location TEXT, -- GPS or manual location
  tags TEXT[], -- array of tags
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_id INTEGER, -- links to recurring_transactions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring transactions (salary, rent, subscriptions)
CREATE TABLE recurring_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES budget_categories(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  auto_create BOOLEAN DEFAULT FALSE, -- auto-create transactions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bill reminders
CREATE TABLE bill_reminders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2),
  due_date DATE NOT NULL,
  frequency VARCHAR(20) CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  category_id INTEGER REFERENCES budget_categories(id),
  is_paid BOOLEAN DEFAULT FALSE,
  reminder_days INTEGER DEFAULT 3, -- remind X days before
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences and settings
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  currency VARCHAR(3) DEFAULT 'ZAR',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  budget_alerts BOOLEAN DEFAULT TRUE,
  goal_reminders BOOLEAN DEFAULT TRUE,
  monthly_report BOOLEAN DEFAULT TRUE,
  theme VARCHAR(20) DEFAULT 'dark',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications/alerts
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'budget_alert', 'goal_reminder', 'bill_due', etc.
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- Insert default account types
INSERT INTO account_types (name, description, icon) VALUES
('Checking', 'Everyday spending account', 'credit-card'),
('Savings', 'Savings and emergency fund', 'piggy-bank'),
('Credit Card', 'Credit card account', 'credit-card'),
('Investment', 'Investment and retirement', 'trending-up'),
('Cash', 'Physical cash', 'banknote');

-- DEBTS TABLE
CREATE TABLE debts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  balance DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  monthly_payment DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('credit-card', 'personal-loan', 'student-loan', 'mortgage', 'other')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_debts_user ON debts(user_id);

-- TAX DEDUCTIONS TABLE
CREATE TABLE tax_deductions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  receipt VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tax_deductions_user ON tax_deductions(user_id);
CREATE INDEX idx_tax_deductions_date ON tax_deductions(date);

-- BUDGET TIPS TABLE
CREATE TABLE budget_tips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('saving', 'budgeting', 'investing', 'debt', 'lifestyle')),
  details JSONB,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budget_tips_user ON budget_tips(user_id);
CREATE INDEX idx_budget_tips_category ON budget_tips(category);

-- TIP LIKES TABLE
CREATE TABLE tip_likes (
  id SERIAL PRIMARY KEY,
  tip_id INTEGER REFERENCES budget_tips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tip_id, user_id)
);

CREATE INDEX idx_tip_likes_tip ON tip_likes(tip_id);
CREATE INDEX idx_tip_likes_user ON tip_likes(user_id);

-- TIP COMMENTS TABLE
CREATE TABLE tip_comments (
  id SERIAL PRIMARY KEY,
  tip_id INTEGER REFERENCES budget_tips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tip_comments_tip ON tip_comments(tip_id);
CREATE INDEX idx_tip_comments_user ON tip_comments(user_id);

-- Insert default categories (South African context)
INSERT INTO budget_categories (user_id, name, icon, color) VALUES
(NULL, 'Groceries', 'shopping-cart', '#10B981'),
(NULL, 'Petrol', 'car', '#F59E0B'),
(NULL, 'Rent/Bond', 'home', '#EF4444'),
(NULL, 'Utilities', 'zap', '#8B5CF6'),
(NULL, 'Insurance', 'shield', '#06B6D4'),
(NULL, 'Entertainment', 'film', '#EC4899'),
(NULL, 'Restaurants', 'utensils', '#F97316'),
(NULL, 'Transport', 'bus', '#84CC16'),
(NULL, 'Medical', 'heart', '#14B8A6'),
(NULL, 'Education', 'book', '#3B82F6'),
(NULL, 'Clothing', 'shirt', '#A855F7'),
(NULL, 'Salary', 'briefcase', '#22C55E'),
(NULL, 'Freelance', 'laptop', '#06B6D4'),
(NULL, 'Investment', 'trending-up', '#8B5CF6');
