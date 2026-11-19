# Testing Standards

## Framework

Ledger Tactica uses Vitest for frontend and backend unit and integration tests.
Each package owns its dependencies, configuration and test scripts.

## Test Locations

Tests are colocated with the code they cover and use `.test.ts` or `.test.tsx`
suffixes.

Examples:

```text
frontend/src/pages/HomePage.test.tsx
backend/src/app.test.ts
```

## Running Tests

Run commands from the relevant package directory:

```bash
npm test
npm run test:watch
npm run coverage
```

`test` runs the suite once, `test:watch` starts Vitest in watch mode, and `coverage`
reports V8 coverage in the terminal and an HTML report under `coverage/`.

## Frontend Tests

Frontend component tests use jsdom and React Testing Library. Assert user-observable
behavior through accessible roles and visible text rather than component internals.

## Backend Tests

Backend API tests use Supertest against the exported Express app. Test the app without
starting the server or binding a port. Use HTTP-level requests and assert response
status and payload.

## Test Expectations

- Add or update tests for business logic, validation, points calculation and data
  loading.
- Cover API behavior through requests to the Express app.
- Keep tests deterministic and independent of external services.
- Add tests for user-visible frontend behavior; avoid tests that only verify static
  markup without supporting a meaningful workflow.
- Do not add coverage thresholds until the codebase has meaningful business-logic
  coverage.
