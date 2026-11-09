# PF-002: Frontend Framework Decision

## Status

Accepted

## Decision

The frontend will be built using:

- React
- TypeScript
- Vite

## Reasoning

React provides a mature component ecosystem.

TypeScript provides strong typing and improved maintainability.

Vite offers a fast development experience while maintaining a simple application structure.

## Alternatives Considered

### Next.js

Rejected.

Reason:

The MVP does not require:

- Server-side rendering
- Static site generation
- SEO optimisation

The added complexity provides little value at this stage.

## Consequences

The application will initially operate as a Single Page Application (SPA).

Future migration to Next.js remains possible if requirements change.
