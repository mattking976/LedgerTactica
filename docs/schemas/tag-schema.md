# Tag Schema

## Purpose

Tags provide a flexible mechanism for classification, filtering and validation throughout Ledger Tactica.

Tags are designed to minimise game-specific logic within application code by allowing behaviour to be driven through data.

---

## Responsibilities

Tags are responsible for:

- Classification
- Army organisation
- Rules interaction
- Validation targeting
- Search and filtering

---

## Non-Responsibilities

Tags should not contain:

- Display logic
- Cost information
- Unit data
- Rule implementation

Tags identify information.

They do not own information.

---

## Design Principles

### Tags Are Data

Tags must be stored and maintained through data definitions.

Application code should not contain hardcoded tag definitions.

---

### Tags Are Reusable

A tag may be applied to:

- Units
- Upgrades
- Rules

---

### Tags Are Not Hierarchies

A tag should describe a characteristic.

It should not describe a parent-child structure.

---

## Categories

### Classification Tags

Examples:

```text
infantry
vehicle
character
tank
artillery
```

### Organisation Tags

Examples:

```text
hq
troops
elite
fast-attack
```

### Rules Tags

Examples:

```text
line
officer
master-of-legion
```

---

## Example

```json
[
  "infantry",
  "hq",
  "character"
]
```

---

## Notes

Tags are one of the primary mechanisms used by the validation engine.

Whenever possible, business logic should rely on tags rather than specific unit names.
