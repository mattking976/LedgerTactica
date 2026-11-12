# Development Standards

## Branch Naming

Feature work:

```text
feature/PF-001-repository
```

Bug fixes:

```text
bugfix/PE-002-points-calculation
```

Documentation:

```text
docs/schema-update
```

---

## Commit Format

Feature:

```text
feat: add roster creation
```

Fix:

```text
fix: correction to validation engine
```

Documentation:

```text
docs: update architecture decisions
```

Refactor:

```text
refactor: simplify rules evaluation
```

---

## Pull Requests

Every pull request should contain:

- Description
- Linked issue
- Acceptance criteria
- Testing notes

---

## Definition of Done

Work is complete when:

- Acceptance criteria met
- Documentation updated
- Code reviewed
- Feature tested

## Change Management

All development work should consider the following artefacts:

1. Source Code
2. Documentation
3. Testing
4. Project Tracking

Before a pull request is completed, the developer should determine whether updates are required in any of these areas.

Questions to ask:

- Does documentation need updating?
- Does a new ticket need creating?
- Does an existing ticket need updating?
- Do new tests need adding?
- Do existing tests need updating?

## Testing Policy

Manual testing is acceptable during project foundation work.

Once TS-001 is completed:

- All new business logic must include automated tests.
- Existing tests must be updated when functionality changes.
- Pull requests affecting business logic should not be merged with failing tests.

Testing priorities are:

1. Rules Engine
2. Validation Logic
3. Points Calculation
4. Data Loading
5. API Behaviour
6. User Workflows

Static UI elements should only be tested where they support critical workflows.
