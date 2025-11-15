# Budgeter Backend API

A comprehensive South African finance management API built with Node.js, Express, and PostgreSQL.

## Features

### 🔐 Authentication & Security
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting and security headers
- Input validation with Joi

### 💰 Financial Management
- **Multiple Accounts**: Checking, Savings, Credit Cards, Investments
- **Smart Categorization**: Custom budget categories with limits
- **Goal Tracking**: Set and track financial goals with progress
- **Recurring Transactions**: Automated salary, bills, subscriptions
- **Receipt Storage**: Upload and store receipt images

### 📊 Analytics & Insights
- Real-time spending analytics
- Budget performance tracking
- Goal progress monitoring
- Spending trends and patterns
- Financial health insights

### 🔄 Automation
- Auto-create recurring transactions
- Budget alerts and notifications
- Goal achievement celebrations
- Bill reminders

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and setup**
```bash
cd backend
npm install
```

2. **Database setup**
```bash
# Create PostgreSQL database
createdb budgeter

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

3. **Run migrations**
```bash
npm run migrate
```

4. **Start development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Accounts
- `GET /api/accounts` - Get user accounts
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `POST /api/accounts/transfer` - Transfer between accounts

### Transactions
- `GET /api/transactions` - Get transactions (with filters)
- `POST /api/transactions` - Create transaction (with receipt upload)
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/analytics` - Get spending analytics

### Budget Categories
- `GET /api/budgets/categories` - Get budget categories
- `POST /api/budgets/categories` - Create category
- `PUT /api/budgets/categories/:id` - Update category
- `DELETE /api/budgets/categories/:id` - Delete category
- `GET /api/budgets/performance` - Get budget performance
- `GET /api/budgets/trends` - Get spending trends

### Goals
- `GET /api/goals` - Get financial goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `POST /api/goals/:id/contribute` - Add contribution to goal
- `GET /api/goals/:id/analytics` - Get goal analytics

### Recurring Transactions
- `GET /api/recurring` - Get recurring transactions
- `POST /api/recurring` - Create recurring transaction
- `PUT /api/recurring/:id` - Update recurring transaction
- `DELETE /api/recurring/:id` - Delete recurring transaction
- `POST /api/recurring/:id/execute` - Execute recurring transaction
- `GET /api/recurring/upcoming` - Get upcoming transactions
- `GET /api/recurring/overdue` - Get overdue transactions

### Analytics
- `GET /api/analytics/dashboard` - Comprehensive dashboard data
- `GET /api/analytics/insights` - AI-powered spending insights

## Database Schema

### Core Tables
- **users** - User accounts and profiles
- **accounts** - Bank accounts, credit cards, etc.
- **transactions** - All financial transactions
- **budget_categories** - Spending categories with limits
- **goals** - Financial goals and targets
- **recurring_transactions** - Automated recurring payments
- **notifications** - System notifications and alerts

### South African Features
- ZAR currency support
- SA ID number validation
- Local bank integration ready
- Tax year calculations (March-February)

## Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=budgeter
DB_USER=postgres
DB_PASSWORD=your_password

# Security
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# File Uploads
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

## Development

### File Structure
```
backend/
├── routes/           # API route handlers
├── middleware/       # Custom middleware
├── database/         # Database connection & schema
├── scripts/          # Migration and utility scripts
├── uploads/          # File upload storage
└── server.js         # Main application entry
```

### Adding New Features

1. **Create route handler** in `routes/`
2. **Add validation schema** using Joi
3. **Update database schema** if needed
4. **Add tests** for new endpoints
5. **Update API documentation**

### Database Migrations

To add new tables or modify existing ones:

1. Update `database/schema.sql`
2. Run `npm run migrate`
3. Test with sample data

## Production Deployment

### Docker (Recommended)
```bash
# Build image
docker build -t budgeter-api .

# Run with environment
docker run -p 3001:3001 --env-file .env budgeter-api
```

### Manual Deployment
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT_SECRET
4. Enable SSL/HTTPS
5. Configure file storage (AWS S3, etc.)

## Security Considerations

- JWT tokens expire in 7 days
- Passwords hashed with bcrypt (12 rounds)
- Rate limiting: 100 requests per 15 minutes
- Input validation on all endpoints
- SQL injection protection via parameterized queries
- File upload restrictions (images only, 5MB max)

## API Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... },
  "pagination": { ... } // for paginated endpoints
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": ["Validation error 1", "Validation error 2"]
}
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details
