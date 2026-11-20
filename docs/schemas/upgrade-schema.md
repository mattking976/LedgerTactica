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

| Field | Type | Required | Description |
|----------|----------|----------|-------------|
| id | string | Yes | Upgrade identifier |
| name | string | Yes | Display name |
| category | string | Yes | Upgrade category |
| cost | number | Yes | Cost for one selected Upgrade quantity |
| costModel | string | No | `flat` or `per-model`; defaults to `flat` |
| tags | string[] | No | Classification tags |
| supported | boolean | Yes | Active support status |

### Cost Models

`flat` is the MVP default. One selected Upgrade costs `cost` once per Roster Entry,
regardless of entry model count.

```json
{
  "id": "paragon-blade",
  "name": "Paragon Blade",
  "category": "weapon",
  "cost": 25,
  "costModel": "flat",
  "supported": true
}
```

`per-model` costs `cost` for each selected Upgrade quantity. It is intended for
additional models or separately priced items. The Roster Entry may select a quantity
within the constraints declared by the Unit.

```json
{
  "id": "tactical-optional",
  "name": "Optional Model",
  "category": "additional-model",
  "cost": 12,
  "costModel": "per-model",
  "supported": true
}
```

The Unit's `availableUpgrades` entry controls eligibility and `min`/`max`
selection quantities. An Upgrade cannot select a quantity outside those bounds.

### Invalid Example

```json
{
  "id": "negative-upgrade",
  "name": "Negative Upgrade",
  "category": "weapon",
  "cost": -10,
  "costModel": "flat",
  "supported": true
}
```

Negative costs and unsupported cost models are invalid.

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
