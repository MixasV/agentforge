# AgentForge: No-Code x402-Powered Agent Builder for Solana

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solana](https://img.shields.io/badge/Solana-Mainnet-14F195)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)

## What is AgentForge?

AgentForge is the first **no-code workflow automation platform** designed specifically for the Solana ecosystem, combining:

- 🎯 **Drag-and-drop workflow builder** (inspired by n8n)
- ⚡ **x402 hybrid payment model** (prepayment + instant credits)
- 🚀 **One-click Telegram deployment**
- 🔒 **Zero private key exposure** (uses Solana session keys)

## Problem We Solve

1. **Existing automation tools** (n8n, Zapier) aren't Solana-native
2. **x402 alone is slow** for high-frequency trading (~1000ms+ latency per request)
3. **Telegram bots expose private keys** to security risks

## Our Solution

- **Hybrid x402 model**: One-time prepayment = instant credits for thousands of API calls
- **n8n-style canvas**: Create bots without any coding knowledge
- **Direct Telegram integration**: Deploy and execute in minutes
- **Solana session keys**: Users never expose their private keys

## Features

- ✅ 10 pre-built blocks (Jupiter, Pump.fun, Helius, LLM, etc.)
- ✅ Drag-and-drop workflow builder
- ✅ x402 prepayment system (Coinbase facilitator)
- ✅ Telegram bot deployment
- ✅ Real-time execution logs
- ✅ Credits-based API charging
- ✅ 100% open source (MIT)

## Tech Stack

### Backend
- Node.js 20+ / Express.js
- TypeScript (strict mode)
- PostgreSQL + Prisma ORM
- Socket.io (real-time updates)
- @solana/web3.js

### Frontend
- React 18.2+ with TypeScript
- React Flow (drag-and-drop canvas)
- TailwindCSS (styling)
- Zustand (state management)
- TanStack Query (server state)
- Vite (build tool)

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (optional, for local DB)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/agentforge.git
cd agentforge
```

2. **Start PostgreSQL (using Docker)**
```bash
docker-compose up -d
```

3. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run db:push
npm run dev
```

4. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Project Structure

```
agentforge/
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, credits charging
│   │   ├── utils/           # Helpers, logger, errors
│   │   └── types/           # TypeScript types
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── store/           # Zustand stores
│   │   ├── services/        # API client
│   │   └── types/           # TypeScript types
│   └── package.json
│
└── docker-compose.yml       # Local development setup
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentforge
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
COINBASE_API_KEY=your-coinbase-api-key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
```

## Development Workflow

1. **Before Starting Work**
   - Read AGENTS.md for coding guidelines
   - Check existing implementations
   - Plan the complete solution

2. **During Implementation**
   - Write real, working code (no placeholders)
   - Add proper error handling
   - Follow TypeScript best practices

3. **Before Committing**
   ```bash
   # Backend
   cd backend
   npm run lint
   npm run typecheck
   npm test
   
   # Frontend
   cd frontend
   npm run lint
   npm run typecheck
   npm run build
   ```

## API Documentation

### Authentication
- `POST /auth/phantom/login` - Login with Phantom wallet
- `POST /auth/telegram/login` - Login with Telegram
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Credits
- `GET /api/credits/balance` - Get credits balance
- `GET /api/credits/usage` - Get usage statistics
- `GET /api/credits/transactions` - Get transaction history

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Dark Research Model

We follow the [Dark Research open source strategy](https://www.darkresearch.ai/blog/project-open-source):
- Core infrastructure is open source
- Contributors can earn via Merit system
- Partnership model with ecosystem providers

## Roadmap

### Phase 1: MVP (Current)
- ✅ Basic workflow builder
- ✅ x402 prepayment system
- ✅ Telegram deployment
- ✅ 10 core blocks

### Phase 2: Enhanced Integrations
- 🔲 Browser extensions
- 🔲 Website widgets
- 🔲 Discord bot deployment
- 🔲 Community block marketplace

### Phase 3: Team Features
- 🔲 Multi-user teams
- 🔲 Advanced permissions
- 🔲 CI/CD integration
- 🔲 Self-hosted facilitator

### Phase 4: Enterprise
- 🔲 Mobile app
- 🔲 Enterprise SLA
- 🔲 Custom AI model fine-tuning

## Security

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Validate all user input on backend
- Encrypt session keys
- Review [SECURITY.md](SECURITY.md) for details

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- **Documentation**: [docs.agentforge.app](https://docs.agentforge.app)
- **Discord**: [Join our community](https://discord.gg/agentforge)
- **Issues**: [GitHub Issues](https://github.com/yourusername/agentforge/issues)
- **Email**: support@agentforge.app

## Acknowledgments

- Inspired by [n8n](https://github.com/n8n-io/n8n) architecture
- Built on [Solana](https://solana.com) blockchain
- Powered by [x402 protocol](https://solana.com/x402)
- Following [Dark Research](https://www.darkresearch.ai) open source strategy

---

**Built with ❤️ for the Solana community**
