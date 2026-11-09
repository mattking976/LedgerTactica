# System Architecture

## High Level Overview

```text
┌────────────────────┐
│ Frontend (React)   │
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ Backend API        │
│ Node + Express     │
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ Rules Engine       │
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ Game Data          │
│ JSON Files         │
└────────────────────┘
```

## Architectural Goals

- Data driven
- System agnostic
- Scalable
- Maintainable

## Design Principles

### Game Systems Are Data

New systems should be added through configuration.

### Rules Are Configurable

Validation logic should consume rule definitions.

### Validation Operates On Tags

Rules should validate tags, not specific unit names.

### Frontend Must Remain Generic

Frontend components should consume data structures rather than game-specific implementations.

## Frontend Architecture

The frontend will be developed as a Single Page Application (SPA).

### Technology Stack

```text
React
TypeScript
Vite
React Router
Tailwind CSS
```

### Responsibilities

The frontend is responsible for:

- User interaction
- Roster management UI
- Validation display
- Data presentation

Business rules and validation logic should remain outside UI components wherever possible.

## Initial Route Structure

```text
/
└── Home Page

/rosters
└── Roster Management
```

Routes should be registered centrally through the router configuration.

Layouts should remain separate from page implementations to encourage reuse and consistency.
