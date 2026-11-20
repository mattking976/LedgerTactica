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
| id | string | Yes | Stable roster-entry identifier |
| unitId | string | Yes | Referenced unit |
| quantity | number | Yes | Number of models in this Roster Entry |
| selectedUpgrades | array | No | Upgrade selections and quantities |

### quantity

`quantity` always represents models for that Roster Entry. It is not a count of
separate Roster Entries.

- A character or tank uses `quantity: 1`.
- A five-model squad uses `quantity: 5`.
- A variable-size squad may use any quantity from the Unit's `minSize` through
  `maxSize`.

Multiple copies of the same Unit template must be represented by separate Roster
Entries. This keeps entry size unambiguous and allows each entry to carry its own
Upgrade selections. Each entry has a stable `id` so it can be edited or removed
independently, including when multiple entries reference the same Unit.

### selectedUpgrades

Each Upgrade selection records its identifier and selected quantity:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| upgradeId | string | Yes | Referenced Upgrade |
| quantity | number | Yes | Number selected |

For a `flat` Upgrade, quantity is the number of models/items selected. For a
`per-model` all-models toggle, quantity is `1`; the Upgrade cost scales across the
Roster Entry's `quantity`.

```json
"selectedUpgrades": [
  { "upgradeId": "paragon-blade", "quantity": 1 }
]
```

---

## Example

```json
{
  "id": "entry-001",
  "unitId": "legion-praetor",
  "quantity": 1,
  "selectedUpgrades": [
    {
      "upgradeId": "paragon-blade",
      "quantity": 1
    }
  ]
}
```

### Invalid Examples

```json
{
  "id": "entry-002",
  "unitId": "tactical-squad",
  "quantity": 12,
  "selectedUpgrades": []
}
```

Invalid when the Unit's `maxSize` is 10.

```json
{
  "id": "entry-003",
  "unitId": "legion-praetor",
  "quantity": 1,
  "selectedUpgrades": [
    {
      "upgradeId": "not-declared-for-this-unit",
      "quantity": 1
    }
  ]
}
```

Invalid because the Upgrade is not declared by the Unit.

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

- id
- unitId
- quantity

### Constraints

- quantity must be greater than zero
- id must be unique within its Roster
- quantity must fall between the referenced Unit's minSize and maxSize
- selected Upgrade IDs must exist and be declared by the Unit
- selected Upgrade quantities must be within the Unit declaration's min/max bounds
- required Upgrade quantities declared by the Unit must be satisfied

### Referential Constraints

- unitId must reference an existing Unit
- selectedUpgrades.upgradeId must reference an existing, eligible Upgrade

---

## Notes

Roster Entries represent player choices.

Unit definitions remain responsible for game content.
