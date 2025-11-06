# Contributing to AgentForge

We love your input! We want to make contributing to AgentForge as easy and transparent as possible.

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
- **Code in English** - All code, comments, UI text
- **Communication in Russian** - Responses to maintainers
- **TypeScript Strict Mode** - Always
- **No placeholders** - Complete implementation only

### Before Committing

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

## Dark Research Model

AgentForge follows the [Dark Research open source strategy](https://www.darkresearch.ai/blog/project-open-source):

- Core infrastructure is open source (MIT)
- Contributors can earn via Merit system (coming soon)
- Revenue sharing for block marketplace creators

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
