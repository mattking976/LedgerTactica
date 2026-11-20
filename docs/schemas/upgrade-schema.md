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
| cost | number | Yes | Cost of one selected Upgrade, interpreted by `costModel` |
| costModel | string | No | `flat` or `per-model`; defaults to `flat` |
| tags | string[] | No | Classification tags |
| supported | boolean | Yes | Active support status |

### Cost Models

`flat` is the MVP default. Cost is `cost` multiplied by the selected Upgrade
`quantity`, regardless of the Roster Entry's model count. This represents options
where the player chooses how many models receive the Upgrade.

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

`per-model` costs `cost` for each selected Upgrade quantity on every model in the
Roster Entry. The formula is `cost * selectedUpgrade.quantity * rosterEntry.quantity`.
Use a selected quantity of `1` for an all-models toggle; its cost then scales with the
Unit size. The Unit's `availableUpgrades` entry controls whether the option may be
selected and its allowed quantity.

```json
{
  "id": "all-model-replacement",
  "name": "All-model replacement",
  "category": "replacement",
  "cost": 5,
  "costModel": "per-model",
  "supported": true
}
```

For example, selecting two models for a 5-point `flat` Upgrade costs 10 points. A
3-point `per-model` Upgrade selected with quantity 1 on a 7-model entry costs 21
points.

```json
{
  "id": "tactical-optional",
  "name": "Optional Model",
  "category": "additional-model",
  "cost": 12,
  "costModel": "flat",
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
