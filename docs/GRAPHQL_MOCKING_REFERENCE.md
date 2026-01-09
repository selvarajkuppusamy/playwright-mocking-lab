# GraphQL Mocking - Production Setup Guide

## Files & Purpose

| File | Purpose |
|------|---------|
| `graphql-operations.har` | Recorded GraphQL operations (intermediate format) |
| `*.mock.ts` | Type-safe mock files - **source of truth for tests** |
| `mock-registry.ts` | Centralized map of all mocks (auto-generated) |
| `generated-types.ts` | TypeScript types from GraphQL schema (auto-generated) |
| `mock-helper.ts` | Test utility for easy mock setup |
| `tsconfig.json` | TypeScript config for mock type checking |
| `mock-extractor.ts` | HAR processing utilities |

## Scripts & Commands

| Script | Command | What It Does | Use Case |
|--------|---------|--------------|----------|
| **test** | `npm test` | Run tests with mocks (offline, fast) | Everyday testing |
| **test:typecheck** | `npm run test:typecheck` | Check mock type safety (non-blocking) | CI/CD validation |
| **record** | `npm run mock:record` | Record operations to HAR | Not recommended - use tests |
| **record:interactive** | `npm run mock:record:interactive` | Browser-based recording | Advanced: manual exploration |
| **extract** | `npm run mock:extract` | Generate mocks from HAR + update registry | After recording |
| **update** | `npm run mock:update` | Re-record all existing operations | CI/CD: refresh mocks |
| **update-registry** | `npm run mock:update-registry` | Update mock-registry.ts | Rarely needed (auto-runs) |
| **validate** | `npm run mock:validate` | Check schema drift (informational) | Weekly health check |
| **codegen** | `npm run mock:codegen` | Generate types from schema | After schema changes |

## Production Workflow (Recommended)

### 🎯 Initial Setup

**1. Install & Configure Playwright**
```bash
npm install -D @playwright/test
npx playwright install
# Configure playwright.config.ts with URLs, test data
```

**2. Import GraphQL Types**
```typescript
// If your frontend has graphql-client package
import type { CreateBookingMutation } from 'graphql-client/codegen';
```

**3. Write Tests Against Live Server**
```typescript
// Write tests with real UI interactions
test("User can create booking", async ({ page }) => {
  await page.goto("https://app.com");
  await page.click('[data-testid="book-now"]');
  // ... assertions
});

// Run against live server - validate functionality
npm test  
```

**4. Record HAR During Test Execution**
```typescript
// Enable HAR recording in playwright.config.ts
use: {
  recordHar: { 
    path: 'mocks/graphql-operations.har',
    content: 'embed'
  }
}

// Run tests → HAR captures GraphQL operations
npm test
```

**5. Extract Mocks**
```bash
npm run mock:extract  # Generates *.mock.ts + updates registry
```

**6. Update Tests to Use Mocks**
```typescript
import { setupGraphQLMocks } from './utils/mock-helper';
import { CreateBookingMock } from '../mocks/graphql/CreateBooking.mock';

test.beforeEach(async ({ page }) => {
  await setupGraphQLMocks(page);  // One-liner!
});

test("User can create booking", async ({ page }) => {
  await page.goto("https://app.com");
  await page.click('[data-testid="book-now"]');
  
  // Assert using mock data (single source of truth)
  const expectedName = CreateBookingMock.data.createBooking.hotel.name;
  await expect(page.locator('[data-testid="hotel"]')).toContainText(expectedName);
});
```

**7. Set Up CI/CD**
```yaml
# .github/workflows/test.yml
- run: npm test                    # Tests with mocks
- run: npm run test:typecheck      # Check mock types (non-blocking warning)
  continue-on-error: true
```

### 🔄 Adding New Tests/Features

**When frontend dev adds new GraphQL operation:**

1. Write new test with UI interactions
2. Run with HAR recording enabled
3. Extract mocks: `npm run mock:extract`
4. Import mock in test for assertions
5. Commit: tests + mocks + registry

### 📊 Schema Drift Handling

**When backend changes GraphQL schema:**

**Devs run codegen** (you don't):
```bash
npm run mock:codegen  # Updates generated-types.ts
```

**You get notified via CI:**
- PR shows warning: "⚠️ Mock type errors detected"
- TypeScript errors in mock files (missing/wrong fields)

**Fix mocks:**
```bash
npm run mock:update    # Re-record from live server
npm run mock:extract   # Regenerate mocks with new schema
npm test               # Verify
```

### 🔍 Weekly Maintenance

```bash
npm run mock:validate  # Check for drift (informational)
# If drift detected → run update + extract
```

## Type Safety

**Mocks are strictly typed:**
```typescript
import type { Country } from './generated-types';

export interface GetCountriesResponse {
  data: {
    countries: Partial<Country>[];  // Type-safe!
  };
}

export const GetCountriesMock: GetCountriesResponse = {
  data: { countries: [...] }  // TypeScript validates structure
};
```

**CI checks types:**
- `npm run test:typecheck` runs `tsc --noEmit`
- Scoped to `mocks/**/*.mock.ts` only
- Non-blocking: warns but doesn't fail PRs
- Shows type errors before tests run

## Test Patterns

**Clean test abstraction:**
```typescript
// Setup once
test.beforeEach(async ({ page }) => {
  await setupGraphQLMocks(page);
  await page.goto("about:blank");
});

// Write readable tests
test("User can login", async ({ page }) => {
  await page.goto("https://app.com/login");
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.click('[data-testid="login-button"]');
  
  const expectedName = LoginUserMock.data.user.name;
  await expect(page.locator('[data-testid="user-name"]')).toContainText(expectedName);
});
```

**With GraphQL helper (optional):**
```typescript
const LOGIN_QUERY = `mutation LoginUser { ... }`;

test("Login API works", async ({ page }) => {
  const response = await executeGraphQLQuery(page, "LoginUser", LOGIN_QUERY);
  expect(response.data.user.token).toBeDefined();
});
```

## Validation Output

```bash
npm run mock:validate

✅ OK       - Schema matches
⚠️ DRIFT    - Fields added/removed → run mock:update
❌ ERROR    - Server errors → check backend health
🚫 REMOVED  - Operation no longer exists → remove tests
```

## Key Principles

✅ **DO:**
- Write tests first against live server
- Record HAR during test execution (captures only what you need)
- Import mock data for assertions (single source of truth)
- Run `mock:extract` after every HAR change
- Commit HAR + mocks + registry to git
- Use strict mode in CI (default)
- Let devs own `mock:codegen` (schema changes)
- Run `test:typecheck` in CI for early warnings

❌ **DON'T:**
- Edit `*.mock.ts` or `mock-registry.ts` manually (auto-generated)
- Edit HAR files manually
- Use `mock:record` for new features (write tests instead)
- Block PRs on type errors (warning only)
- Run validate on every test (informational tool)

## Modes

**Strict Mode (default):**
```bash
npm test  # Fails if mock missing
```

**Permissive Mode:**
```bash
MOCK_STRICT=false npm test  # Falls back to live server
```

Use permissive during PR review to test features before mocking.

## Architecture

```
Frontend App (UI clicks) 
    ↓
GraphQL Requests
    ↓
setupGraphQLMocks() intercepts → serves mock.ts
    ↓
Tests assert UI using mock data
```

**Source of truth:** `*.mock.ts` files (not HAR)
**Type safety:** `generated-types.ts` (from schema)
**Test setup:** `mock-helper.ts` (one-liner)
**CI validation:** `test:typecheck` (warnings, not blockers)
