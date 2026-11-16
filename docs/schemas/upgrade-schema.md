# Upgrade Schema

## Purpose

An Upgrade represents an optional modification that may be applied to a Unit.

Upgrades allow customisation of roster entries without modifying the underlying Unit definition.

---

## Responsibilities

Upgrades are responsible for:

- Additional costs
- Unit customisation
- Validation restrictions
- Configuration choices

---

## Non-Responsibilities

Upgrades should not:

- Modify Unit definitions directly
- Store roster information
- Contain business logic

---

## Design Principles

### Upgrades Are Reusable

The same Upgrade may be available to multiple Units.

---

### Upgrades Are Data

Upgrade behaviour should be defined through data rather than hardcoded logic.

---

### Upgrades Have Categories

Categories provide context for future rules processing.

Examples include:

- weapon
- wargear
- replacement
- additional-model

---

## Fields

| Field | Type | Required |
|----------|----------|----------|
| id | string | Yes |
| name | string | Yes |
| category | string | Yes |
| cost | number | Yes |
| tags | string[] | No |
| supported | boolean | Yes |

---

## Example

```json
{
  "id": "paragon-blade",
  "name": "Paragon Blade",
  "category": "weapon",
  "cost": 25,
  "tags": [
    "melee-weapon"
  ],
  "supported": true
}
```
