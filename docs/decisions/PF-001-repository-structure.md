# PF-001: Repository Structure

## Status

Accepted

## Decision

Ledger Tactica will use a monorepo approach.

## Structure

```text
ledger-tactica
│
├── frontend
├── backend
├── shared
├── data
├── docs
├── scripts
└── .github
```

## Reasoning

Benefits include:

- Simplified development
- Easier dependency management
- Simpler onboarding
- Reduced administrative overhead

## Alternatives Considered

### Multiple Repositories

Rejected.

Reason:

Increased complexity without sufficient benefit during MVP development.

## Consequences

Frontend and backend release cycles remain aligned during MVP development.
