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
