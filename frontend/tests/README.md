# Frontend Tests

## Overview

This directory contains automated tests for the Wrldbldr MCP Manager frontend, with critical tests for Feature 015 (Dashboard Canvas System).

## Test Structure

```
tests/
├── setup.ts                          # Vitest setup (mocks, globals)
├── components/                       # Unit tests for components
│   └── DashboardPage.test.tsx       # T034: Dashboard canvas unit tests
└── e2e/                             # End-to-end tests
    └── dashboard-canvas.spec.ts     # T041: Dashboard canvas E2E tests
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test tests/components/DashboardPage.test.tsx
```

### E2E Tests (Playwright)

**Prerequisites**:
1. Backend must be running: `docker-compose up` (from project root)
2. Frontend dev server: `npm run dev` (from frontend/)
3. Create test user in Keycloak
4. Create test campaign

**Run tests**:
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npx playwright test --ui

# Run specific test
npx playwright test dashboard-canvas

# Debug mode (step through tests)
npx playwright test --debug
```

## Critical Tests for Feature 015

### T034: DashboardPage Unit Test
**File**: `tests/components/DashboardPage.test.tsx`

**What it tests**:
- Dashboard renders with canvas
- "Add Widget" button works
- Widgets can be added/removed
- Layout auto-saves (debounced)
- Empty/loading states display correctly

**Purpose**: Ensures dashboard core functionality stays intact when adding new features.

### T041: Dashboard Canvas E2E Test
**File**: `tests/e2e/dashboard-canvas.spec.ts`

**What it tests**:
- Full user workflow: login → dashboard → add widget → persist
- Widget drag/drop functionality
- Layout persistence after refresh
- View mode toggle affects widget content
- Empty state handling

**Purpose**: Ensures dashboard works correctly in real browser with full backend.

## Test Philosophy

These are **critical regression tests** that ensure the dashboard canvas system continues to work as new features are added to the codebase. They focus on:

1. **Smoke Tests**: Dashboard loads without errors
2. **Core Functionality**: Add/remove widgets, layout persistence
3. **User Workflows**: Full E2E scenarios that users will actually perform
4. **Regression Protection**: Prevent breaking changes when refactoring

## Debugging Failed Tests

### Unit Tests
```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run single test
npm test -- -t "renders dashboard with canvas"
```

### E2E Tests
```bash
# Run with headed browser (see what's happening)
npx playwright test --headed

# Debug mode (pauses at breakpoints)
npx playwright test --debug

# Generate trace (view test execution)
npx playwright test --trace on
```

### Common Issues

1. **"Cannot find module" errors**: Run `npm install` to ensure all dependencies are installed
2. **E2E tests timeout**: Ensure backend is running (`docker-compose up`)
3. **Widget not found**: Check that test campaign has sample data
4. **Authentication fails**: Verify test user credentials in E2E test file

## Writing New Tests

### Unit Test Template
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test';

test('my feature works', async ({ page }) => {
  await page.goto('http://localhost:3000/my-page');
  await expect(page.locator('text=My Feature')).toBeVisible();
});
```

## CI/CD Integration

Tests are designed to run in CI environments:
- Unit tests: `npm test` (fast, no external dependencies)
- E2E tests: `npm run test:e2e` (requires backend running)

For CI pipelines:
```yaml
# .github/workflows/test.yml example
- name: Run unit tests
  run: |
    cd frontend
    npm install
    npm test

- name: Start services for E2E
  run: docker-compose up -d

- name: Run E2E tests
  run: |
    cd frontend
    npx playwright install
    npm run test:e2e
```

## Coverage Goals

- **Unit Tests**: >80% coverage for dashboard components
- **E2E Tests**: Cover critical user workflows
- **Regression Tests**: Prevent breaking changes to core features

## Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Docs](https://playwright.dev/)
