# PF-004: Backend Framework Decision

## Status

Accepted

## Decision

The Ledger Tactica backend will use:

- Node.js
- Express
- TypeScript

## Reasoning

This solution provides:

- Shared language across the stack
- Low complexity
- Fast MVP delivery
- Broad community support

## Alternatives Considered

### .NET

Rejected.

Reason:

Additional complexity and split technology stack for a solo developer project.

### NestJS

Deferred.

Reason:

Provides value at larger scale but adds architectural complexity that is unnecessary during MVP development.

## Consequences

The API will initially follow a lightweight Express architecture.

Additional architectural patterns may be introduced as requirements grow.