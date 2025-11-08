# Contributing to AgentForge

We welcome contributions! This document explains how to contribute.

## Philosophy

AgentForge follows the **Dark Research open source model**:
- Code is a commodity (anyone can write it)
- Real value is in **ecosystem and partnerships**
- Contributors are valued and rewarded

## Development Process

We use GitHub to host code, track issues and feature requests, and accept pull requests.

### Pull Requests Process

1. Fork the repo and create your branch from `main`
2. If you've added code, add tests
3. Ensure the test suite passes
4. Make sure your code lints
5. Issue the pull request

## Coding Guidelines

Please read [AGENTS.md](AGENTS.md) for detailed coding guidelines.

### Key Principles

- **NO FAKE IMPLEMENTATIONS** - Every function must be fully functional
- **REAL CODE ONLY** - Complete implementation or nothing at all
- **Code in English** - All code, comments, UI text
- **TypeScript Strict Mode** - Always
- **No placeholders** - No stubs, no mocks in production code
- **Proper error handling** - Every function must handle errors
- **Write tests** - New features must include tests

### TypeScript
- Strict mode enabled
- No `any` types (use generics)
- Proper error handling

### React
- Functional components only
- Use hooks (useState, useEffect, etc.)
- Document complex components

### Testing
- Write tests for new features
- Run tests before submitting PR: `npm test`

### Before Committing

```bash
# Backend
cd backend
pnpm lint
pnpm typecheck
pnpm test

# Frontend
cd frontend
pnpm lint
pnpm typecheck
pnpm build
```

## Branches

- `master` - Production ready code
- `develop` - Development/staging (if exists)
- `feature/*` - Feature branches
- `fix/*` - Bug fixes

## Commit Messages

Use clear, descriptive messages:
```
feat: Add CDP Embedded Wallets support
fix: Fix x402 payment timeout issue
docs: Update README with CASH integration
test: Add tests for workflow executor
```

## Reporting Bugs

Report bugs using GitHub Issues. Great bug reports include:

- A quick summary
- Steps to reproduce
- What you expected to happen
- What actually happened
- Notes (possibly including why you think this might be happening)

## Feature Requests

We use GitHub Issues to track feature requests. Please provide:

- Clear use case
- Expected behavior
- Why this would be useful
- Any technical considerations

## Code Review Process

1. Maintainers review PRs regularly
2. We may suggest changes or improvements
3. Once approved, we'll merge your PR

## Community

- **Discord** - Coming soon
- **Issues** - For bugs and features
- **Discussions** - For questions and ideas

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Rewards (Merit System)

Significant contributions can earn:

### Tier 1: Bug fixes, small features
- Credit in README
- Contributor badge

### Tier 2: Major features, SDK improvements
- Potential Merit tokens (via [Merit.xyz](https://merit.xyz/))
- Featured in release notes

### Tier 3: Architecture improvements, major integrations
- Direct compensation consideration
- Core contributor status

See [Merit.xyz](https://merit.xyz/) for more info.

## Dark Research Model

AgentForge follows the [Dark Research open source strategy](https://www.darkresearch.ai/):

- Core infrastructure is open source (MIT)
- Community-driven development
- Partnership model with ecosystem providers
- Revenue through hosted SaaS + premium features

### Block Marketplace

When creating custom blocks:

- 70% revenue to block creators
- 30% platform fee
- Must be documented and tested
- Must follow block template

## Getting Started

1. Read [SETUP.md](SETUP.md) for local development
2. Check [Issues](https://github.com/yourusername/agentforge/issues) for good first issues
3. Join our community (Discord coming soon)
4. Start contributing!

## Code of Conduct

Be respectful, inclusive, and professional. We're building for the Solana community.

---

**Thank you for contributing!** 🚀
