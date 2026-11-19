# Roster Entry Schema

## Purpose

A Roster Entry represents a player's selection of a Unit within a specific Roster.

Roster Entries are created from Unit definitions but must remain separate from those definitions.

---

## Responsibilities

A Roster Entry is responsible for:

- Referencing a Unit
- Recording selected upgrades
- Recording selected options
- Recording user customisation

---

## Non-Responsibilities

A Roster Entry should not:

- Duplicate Unit definitions
- Duplicate Upgrade definitions
- Store validation logic
- Store game metadata

---

## Design Principles

### Roster Entries Reference Units

Roster Entries should reference Unit IDs.

#### Recommended

```json
{
  "unitId": "legion-praetor"
}
```

#### Not Recommended

```json
{
  "name": "Praetor",
  "baseCost": 150
}
```

---

### Roster Entries Store Choices

Only user selections belong here.

---

### Unit Definitions Remain Canonical

A Unit definition remains the single source of truth.

---

## Fields

| Field | Type | Required | Description |
|----------|----------|----------|----------|
| unitId | string | Yes | Referenced unit |
| quantity | number | Yes | Number selected |
| selectedUpgrades | string[] | No | Upgrade references |

---

## Example

```json
{
  "unitId": "legion-praetor",
  "quantity": 1,
  "selectedUpgrades": [
    "paragon-blade"
  ]
}
```

---

## Relationships

```text
Roster Entry
│
├── Unit Reference
└── Upgrade References
```

---

## Validation Rules

### Required Fields

- unitId
- quantity

### Constraints

- quantity must be greater than zero

### Referential Constraints

- unitId must reference an existing Unit
- selectedUpgrades must reference existing Upgrades

---

## Notes

Roster Entries represent player choices.

Unit definitions remain responsible for game content.
