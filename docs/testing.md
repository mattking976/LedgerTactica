# Testing Standards

## Framework

Ledger Tactica uses Vitest for frontend and backend unit and integration tests.
Each package owns its dependencies, configuration and test scripts.

Frontend end-to-end tests use Playwright and run in Chromium.

## Test Locations

Unit and integration tests are colocated with the code they cover and use
`.test.ts` or `.test.tsx` suffixes. Frontend end-to-end tests live in `frontend/e2e/`
and use `.spec.ts` suffixes.

Examples:

```text
frontend/src/pages/HomePage.test.tsx
backend/src/app.test.ts
frontend/e2e/navigation.spec.ts
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

Run frontend end-to-end tests from `frontend/`:

```bash
npx playwright install chromium
npm run test:e2e
```

The browser installation is needed once per development machine. Playwright starts
the Vite development server automatically; the current smoke test covers navigation
between the home and rosters pages.

## Continuous Integration

GitHub Actions runs the frontend and backend typechecks, builds and tests for every
pull request and for pushes to `main`. It also runs frontend end-to-end tests using
Playwright Chromium. Dependency installation uses each package's lockfile with
`npm ci`.

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
