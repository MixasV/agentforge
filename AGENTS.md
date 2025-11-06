# Agent Development Guidelines

---

## Core Principles

### 1. Quality Standards
- **NO FAKE IMPLEMENTATIONS**: Never create placeholder, stub, or mock implementations
- **REAL CODE ONLY**: Every function, component, and feature must be fully functional
- **NO SHORTCUTS**: Complete implementation or nothing at all
- **HONEST WORK**: If something cannot be implemented properly, state it explicitly

### 2. Language Requirements
- **Code & UI Text**: Always in English
  - Variable names, function names, comments
  - UI labels, buttons, error messages
  - API responses, documentation strings
- **Responses & Communication**: Always in Russian
  - Explanations to the user
  - Status updates, summaries
  - Error descriptions, recommendations

### 2. GitHub
- NO Co-autors in Git-Hub commit!


## Development Workflow

### Before Starting Work
1. Read the task carefully
2. Check existing implementations and patterns
3. Review related tests
4. Plan the complete solution

### During Implementation
1. Write real, working code
2. Add proper error handling
3. Include validation and edge cases
4. Follow TypeScript best practices
5. Add inline comments for complex logic

### Before Committing
1. Run linters: `pnpm lint`
2. Run type checks: `tsc --noEmit`
3. Run tests: `pnpm test`
4. Review changes: `git diff`
5. Check for secrets or credentials

---

## Testing Requirements

### Unit Tests
- Test business logic in isolation
- Mock external dependencies (DB, blockchain)
- Cover edge cases and error paths
- Use Jest framework

### E2E Tests
- Test user workflows end-to-end
- Use real database (test instance)
- Mock blockchain calls when needed
- Use Playwright framework

### Integration Tests
- Test module interactions
- Test database transactions
- Test API contracts
- Test authentication flows

---

## Security Guidelines

1. **Never commit**:
   - Passwords, API keys, private keys
   - `.env` files with real credentials
   - User data or PII

2. **Always validate**:
   - User input on backend
   - Flow addresses format
   - Numeric boundaries
   - Date/time ranges

3. **Always sanitize**:
   - SQL inputs (use Prisma)
   - HTML output (XSS prevention)
   - File paths (directory traversal)

4. **Use environment variables**:
   - Database credentials
   - API tokens
   - Flow account keys
   - Service endpoints

---

## Code Review Checklist

- [ ] No placeholder implementations
- [ ] All text in English (code/UI)
- [ ] Proper TypeScript types
- [ ] Error handling implemented
- [ ] Tests written and passing
- [ ] No secrets in code
- [ ] Follows existing patterns
- [ ] Documentation updated
- [ ] Performance considered
- [ ] Security reviewed


---

**Remember**: Quality over speed. Real implementations over quick hacks.
