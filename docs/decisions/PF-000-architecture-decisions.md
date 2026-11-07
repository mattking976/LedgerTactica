# PF-000: Architecture Decisions

**Status:** Accepted  
**Date:** 2026-11-05  
**Project:** Ledger Tactica

---

# Purpose

This document records the foundational architectural decisions for the Ledger Tactica project.

Its purpose is to:

- Establish technical direction
- Prevent unnecessary rewrites
- Provide consistency throughout development
- Enable future contributors to understand design choices

This document should be updated when major architectural decisions are made.

---

# Project Vision

Ledger Tactica is intended to be a scalable, system-agnostic tabletop army builder.

The application should allow users to build, validate and manage army rosters for multiple tabletop wargames using a data-driven architecture.

Supported systems may include:

- Horus Heresy
- Bolt Action
- Warhammer 40,000
- The Old World
- Legions Imperialis
- Adeptus Titanicus

The first supported system will be Horus Heresy 3.0.

---

# Core Principles

## Principle 1: Game Systems Are Data

Game systems should be represented through configuration and data.

Where possible, adding a new game system should not require application code changes.

### Good

- Add a new data package
- Add new rules definitions
- Add new unit definitions

### Bad

```typescript
if (game === "Horus Heresy")
```

---

## Principle 2: Rules Are Configurable

Validation logic should consume rule definitions from data.

Rules should not be hardcoded to specific factions or units.

### Good

```json
{
  "requiresTag": "HQ",
  "minimumCount": 1
}
```

### Bad

```typescript
if (faction === "Death Guard")
```

---

## Principle 3: Units Are Generic Entities

All units should share a common underlying structure.

Examples:

- Praetor
- Tactical Squad
- Contemptor
- Bolt Action Officer
- Sherman Tank

All are considered units within the engine.

---

## Principle 4: Validation Uses Tags

Validation should operate on tags rather than names.

Example tags:

```json
[
  "HQ",
  "Infantry",
  "Character",
  "Line"
]
```

This ensures validation remains system agnostic.

---

## Principle 5: Data Before Features

The data model and validation framework are the product.

User interface components should be built around the data model rather than defining it.

---

# MVP Scope

The MVP shall support:

- Horus Heresy 3.0
- Roster creation
- Unit selection
- Upgrade selection
- Points calculation
- Validation
- Local saving/loading

The MVP shall NOT support:

- User accounts
- Cloud synchronisation
- Public roster sharing
- PDFs
- Multiple game systems

---

# Repository Strategy

## Selected Approach

Monorepo

All project components will be maintained within a single repository.

### Reasoning

Benefits include:

- Simplified development
- Easier dependency management
- Easier issue tracking
- Easier onboarding
- Simplified version control

### Structure

```text
ledger-tactica/
│
├── docs/
├── frontend/
├── backend/
├── data/
├── shared/
├── scripts/
├── tests/
└── .github/
```

---

# Frontend Technology

## Selected

```text
React
TypeScript
```

### Reasoning

- Strong ecosystem
- Excellent component model
- Broad community support
- Mobile-friendly
- Future PWA support

---

# Backend Technology

## Selected

```text
Node.js
Express
TypeScript
```

### Reasoning

- Shared language across stack
- Fast development speed
- Flexible architecture
- Large open-source ecosystem

---

# Initial Data Strategy

## Selected

JSON Files

### Reasoning

For MVP purposes, data should be maintained as version-controlled files.

Benefits:

- Easy editing
- Easy review
- Source control friendly
- No database administration
- Rapid iteration

Example:

```text
data/
└── horus-heresy/
    ├── factions/
    ├── units/
    ├── upgrades/
    └── rules/
```

---

# Future Data Strategy

## Selected

PostgreSQL

### Status

Deferred

### Reasoning

A database should only be introduced when it provides clear value.

Potential future uses:

- User accounts
- Cloud roster storage
- Search optimisation
- Community content

---

# Authentication

## MVP Decision

No authentication.

### Reasoning

Authentication does not contribute to core MVP goals.

Implementation may be revisited after MVP completion.

---

# Hosting Strategy

## MVP

To Be Determined

Potential options:

- Vercel
- Railway
- Render
- Self-hosted Docker deployment

No hosting commitment is required during MVP development.

---

# Development Workflow

## Source Control

GitHub

---

## Ticket Tracking

GitHub Projects

---

## Work Item Type

GitHub Issues

---

## Workflow States

```text
Backlog
Ready
In Progress
Testing
Done
```

---

## Branch Naming Convention

Feature:

```text
feature/PF-001-repository
```

Bug Fix:

```text
bugfix/PE-002-points-engine
```

Documentation:

```text
docs/schema-update
```

---

## Commit Convention

Feature:

```text
feat: add roster creation
```

Bug Fix:

```text
fix: correct points calculation
```

Documentation:

```text
docs: update architecture decisions
```

Refactoring:

```text
refactor: simplify unit validation
```

---

# Current Success Criteria

The project foundation phase is complete when:

- Repository exists
- Development standards are documented
- Frontend application runs locally
- Backend application runs locally
- GitHub Project board exists
- Core architecture principles are documented

---

# Future Architecture Decision Records

Future major decisions should be captured as individual documents.

Examples:

```text
PF-001 Frontend Framework Decision
PF-002 Database Migration Decision
DE-001 Data Schema Definition
DE-002 Validation Engine Design
RB-001 Roster Storage Strategy
```

Each decision record should include:

- Context
- Decision
- Consequences
- Alternatives considered

---

# Revision History

| Version | Date | Summary |
|----------|----------|----------|
| 1.0 | 2026-11-05 | Initial architecture decisions created |
