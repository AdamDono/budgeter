-- ============================================
-- DATABASE MIGRATIONS FOR NEW FEATURES
-- ============================================

-- DEBTS TABLE
CREATE TABLE IF NOT EXISTS debts (
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
CREATE TABLE IF NOT EXISTS tax_deductions (
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
CREATE TABLE IF NOT EXISTS budget_tips (
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
CREATE TABLE IF NOT EXISTS tip_likes (
  id SERIAL PRIMARY KEY,
  tip_id INTEGER REFERENCES budget_tips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tip_id, user_id)
);

CREATE INDEX idx_tip_likes_tip ON tip_likes(tip_id);
CREATE INDEX idx_tip_likes_user ON tip_likes(user_id);

-- TIP COMMENTS TABLE
CREATE TABLE IF NOT EXISTS tip_comments (
  id SERIAL PRIMARY KEY,
  tip_id INTEGER REFERENCES budget_tips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tip_comments_tip ON tip_comments(tip_id);
CREATE INDEX idx_tip_comments_user ON tip_comments(user_id);
