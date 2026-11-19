# Data Structure

## Purpose

This document defines how game data is organised within Ledger Tactica.

The structure is designed to support multiple game systems and multiple editions simultaneously while minimising application code changes.

---

# Design Principles

## Self-Contained Game Packages

Each Game should exist as a self-contained package.

Example:

```text
horus-heresy-3e
```

contains all content needed to support that game.

---

## References Over Duplication

Data should reference related entities through IDs.

Example:

```json
{
  "factionId": "death-guard"
}
```

---

## One Entity Per File

Game content should be stored using one file per entity where practical.

Benefits:

- Easier maintenance
- Cleaner git history
- Reduced merge conflicts

---

# Directory Structure

```text
data/
│
├── horus-heresy-3e/
│   │
│   ├── game.json
│   │
│   ├── factions/
│   ├── units/
│   ├── upgrades/
│   ├── tags/
│   └── rules/
│
├── horus-heresy-2e/
│
├── bolt-action-3e/
│
└── warhammer-40k-8e/
```

---

# Naming Conventions

## File Names

Use kebab-case.

Example:

```text
legion-praetor.json
```

---

## IDs

Use kebab-case.

Example:

```text
legion-praetor
```

File names should match IDs.

---

# Future Considerations

Potential future additions:

```text
detachments/
formations/
rites-of-war/
scenarios/
```

Current implementation should allow these additions without structural redesign.
