# Core Entity Relationships

## Purpose

This document provides a high-level view of the Ledger Tactica domain model.

It should be used as a reference when designing new schemas, implementing features or evaluating architectural decisions.

---

# Current Domain Model

```text
Game
│
├── Factions
│
├── Rules
│
└── Units
      │
      ├── Tags
      ├── Available Upgrades
      └── Validation Rules


Roster
│
├── Game Reference
├── Faction Reference
│
└── Roster Entries
       │
       ├── Unit Reference
       └── Selected Upgrades
```

## Ownership Hierarchy

A Game owns one or more Factions.

A Faction owns one or more Units.

Units are the lowest-level entity currently defined within the domain model.

---

## Ownership Model

```text
Game
└── Faction
     └── Unit

Roster
└── Roster Entry
```

## Reference Model

```text
Roster
│
├── References Game
├── References Faction
│
└── Contains Roster Entries
       │
       ├── References Unit
       └── References Upgrades
```

## Edition Support

Ledger Tactica models individual editions as separate Game entities.

Examples:

```text
Warhammer 40,000 8th Edition
Warhammer 40,000 10th Edition
Horus Heresy 2.0
Horus Heresy 3.0
```

This simplifies:

- Validation
- Version management
- Legacy support
- Content maintenance

---

## Planned Future Domain Model

```text
Game
│
├── Factions
│
├── Rules
│
└── Units
      │
      ├── Tags
      ├── Available Upgrades
      └── Validation Rules


Roster
│
├── Game Reference
├── Faction Reference
│
└── Roster Entries
       │
       ├── Unit Reference
       └── Selected Upgrades
```

---

## Architectural Principles

- Everything is data
- References over duplication
- Rules operate on tags
- Editions are independent
- Units are templates
- Rosters contain selections
```

### References Over Duplication

Entities should reference each other by ID.

Example:

```json
{
  "unitId": "legion-praetor"
}
```

Rather than duplicating Unit definitions inside other entities.

---

### Editions Are Independent

Each supported edition is treated as an independent Game implementation.

This allows multiple editions to be supported simultaneously.

---

## Notes

This diagram should evolve as additional entities are introduced.

Future additions will include:

- Upgrades
- Tags
- Rules
- Rosters
- Validation Engine
