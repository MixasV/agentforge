# AgentForge Setup Guide

## Prerequisites

Before starting, ensure you have installed:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- **Phantom Wallet** (for testing) - [Install](https://phantom.app/)

Optional:
- **Docker & Docker Compose** - For containerized database

---

## Quick Start (5 minutes)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/agentforge.git
cd agentforge
```

### 2. Start Database

**Option A: Docker (Recommended)**
```bash
docker-compose up -d
```

**Option B: Local PostgreSQL**
```bash
# Create database
createdb agentforge

# Or via psql
psql -U postgres
CREATE DATABASE agentforge;
\q
```

### 3. Setup Backend

```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentforge

# Generate Prisma client and push schema
npm run db:generate
npm run db:push

# Start backend server
npm run dev
```

Backend will start on http://localhost:3001

### 4. Setup Frontend

```bash
cd frontend
npm install

# Start frontend development server
npm run dev
```

Frontend will start on http://localhost:3000

### 5. Access Application

Open http://localhost:3000 in your browser and connect with Phantom wallet.

---

## Detailed Setup

### Backend Configuration

Edit `backend/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agentforge?schema=public"

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT (change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Solana
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# x402 (Optional - for production)
COINBASE_API_KEY=your-coinbase-api-key
AGENTFORGE_PAYMENT_WALLET=your-solana-wallet-address

# Telegram (Optional - for bot deployment)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### Frontend Configuration

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

### Database Migrations

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Open Prisma Studio (GUI for database)
npm run db:studio
```

---

## Development Workflow

### Running in Development

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Database (if using Docker):**
```bash
docker-compose up
```

### Code Quality Checks

**Backend:**
```bash
cd backend
npm run lint          # ESLint
npm run typecheck     # TypeScript check
npm test              # Jest tests
```

**Frontend:**
```bash
cd frontend
npm run lint          # ESLint
npm run typecheck     # TypeScript check
npm run build         # Vite build
```

---

## Testing Phantom Wallet Login

1. Install [Phantom Wallet](https://phantom.app/) browser extension
2. Create or import a wallet
3. Switch to **Devnet** in Phantom settings
4. Visit http://localhost:3000
5. Click "Connect with Phantom"
6. Approve connection and signature request

---

## Testing x402 Prepayment

In development mode, payments are simulated:

1. Go to **Billing** page
2. Click "Add Credits"
3. Select amount (e.g., $50)
4. Click "Proceed with Payment"
5. Wait 2 seconds for simulation
6. Credits will be added automatically

**Note:** In production, this would trigger real Phantom wallet transaction.

---

## Common Issues

### Issue: Database connection failed

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# If using Docker:
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres
```

### Issue: Port 3001 already in use

**Solution:**
```bash
# Find process using port
lsof -ti:3001

# Kill process
kill -9 $(lsof -ti:3001)

# Or change port in backend/.env
PORT=3002
```

### Issue: Prisma client not generated

**Solution:**
```bash
cd backend
npm run db:generate
```

### Issue: Frontend can't connect to backend

**Solution:**
```bash
# Check backend is running
curl http://localhost:3001/health

# Check CORS settings in backend/src/app.ts
# Ensure FRONTEND_URL matches your frontend URL
```

---

## Project Structure

```
agentforge/
├── backend/                 # Node.js + Express backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, error handling
│   │   ├── utils/          # Helpers, logger
│   │   └── types/          # TypeScript types
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
│
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Zustand stores
│   │   └── services/       # API client
│   └── package.json
│
├── docker-compose.yml       # Docker services
├── README.md
└── SETUP.md (this file)
```

---

## Next Steps

1. **Explore the Dashboard** - See your workflows and credits
2. **Create a Workflow** - Use drag-and-drop canvas
3. **Add Credits** - Test prepayment system
4. **Run a Workflow** - Execute and see logs
5. **Read API Docs** - See `API.md` for endpoint details

---

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup:
- Environment variables for production
- Database migration strategy
- SSL/TLS configuration
- Monitoring and logging
- Backup procedures

---

## Support

- **Documentation:** [docs](./docs/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/agentforge/issues)
- **Discord:** [Join community](https://discord.gg/agentforge)

---

**Need help?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or open an issue.
