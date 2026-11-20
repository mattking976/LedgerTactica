# Unit Schema

## Purpose

A Unit represents a selectable roster component.

Examples include:

- Praetor
- Tactical Squad
- Contemptor Dreadnought
- Rifle Section
- Sherman Tank

Units are the primary building blocks from which player rosters are assembled.

---

## Responsibilities

A Unit is responsible for:

- Identity
- Base cost
- Unit sizing
- Classification
- Available upgrades

---

## Non-Responsibilities

A Unit should not contain:

- Player selections
- Chosen upgrades
- Roster state
- User preferences
- Full rules text
- Weapon profiles
- Narrative content

Ledger Tactica is an army builder, not a rules reference.

The application should contain sufficient information to build and validate armies without duplicating entire rules publications.

---

## Design Principles

### Units Are Templates

Units represent definitions.

They do not represent roster entries.

#### Unit Definition

```json
{
  "id": "legion-praetor"
}
```

#### Roster Entry

```json
{
  "unitId": "legion-praetor",
  "quantity": 1,
  "selectedUpgrades": []
}
```

These concepts must remain separate.

---

### Tags Are Mandatory

Every Unit must contain at least one Tag.

Tags support:

- Classification
- Validation
- Filtering
- Rules evaluation

---

### IDs Are Permanent

Application logic should reference Unit IDs rather than display names.

---

### Costs Belong To Units

Base costs should be owned by Unit definitions.

Business logic should consume costs rather than generate them.

---

## Fields

| Field | Type | Required | Description |
|----------|----------|----------|----------|
| id | string | Yes | Unit identifier |
| factionId | string | Yes | Parent faction |
| name | string | Yes | Display name |
| baseCost | number | Yes | Cost for a fixed-size Unit or the cost at `minSize` for a variable-size Unit |
| costModel | object | No | Data-driven variable-size cost model; defaults to `fixed` |
| minSize | number | Yes | Minimum models |
| maxSize | number | Yes | Maximum models |
| availableUpgrades | array | No | Upgrade eligibility and selection constraints |
| tags | string[] | Yes | Classification tags |
| supported | boolean | Yes | Active support status |

### costModel

The default cost model is `fixed`. It uses `baseCost` once for the Roster Entry,
regardless of the entry's `quantity` within `minSize` to `maxSize`.

```json
{
  "type": "fixed"
}
```

For linear variable-size pricing, `baseCost` covers the `minSize` configuration.
Every additional model costs `additionalModelCost`:

```json
{
  "type": "per-model",
  "additionalModelCost": 10
}
```

For tiered variable-size pricing, define each inclusive size range:

```json
{
  "type": "size-tier",
  "tiers": [
    { "minSize": 5, "maxSize": 7, "cost": 80 },
    { "minSize": 8, "maxSize": 10, "cost": 140 }
  ]
}
```

Future pricing models may be added without changing Roster Entry structure.
Consumers must reject unknown or malformed `costModel` values explicitly.

### availableUpgrades

Each entry declares one Upgrade and its MVP selection constraints:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| upgradeId | string | Yes | Referenced Upgrade |
| min | number | No | Minimum selected quantity; defaults to 0 |
| max | number | No | Maximum selected quantity; defaults to 1 |

```json
"availableUpgrades": [
  { "upgradeId": "paragon-blade", "min": 0, "max": 1 },
  { "upgradeId": "tactical-optional", "min": 0, "max": 5 }
]
```

`min` and `max` refer to upgrade quantities, not the number of models. Separate
Upgrade entries remain reusable across Units.

---

## Example

```json
{
  "id": "legion-praetor",
  "factionId": "death-guard",
  "name": "Praetor",
  "baseCost": 150,
  "costModel": {
    "type": "fixed"
  },
  "minSize": 1,
  "maxSize": 1,
  "availableUpgrades": [
    {
      "upgradeId": "paragon-blade",
      "min": 0,
      "max": 1
    }
  ],
  "tags": [
    "hq",
    "character",
    "master-of-legion"
  ],
  "supported": true
}
```

### Variable-Size Example

```json
{
  "id": "tactical-squad",
  "factionId": "death-guard",
  "name": "Tactical Squad",
  "baseCost": 100,
  "costModel": {
    "type": "per-model",
    "additionalModelCost": 12
  },
  "minSize": 5,
  "maxSize": 10,
  "availableUpgrades": [
    {
      "upgradeId": "tactical-optional",
      "min": 0,
      "max": 5
    }
  ],
  "tags": [
    "troops",
    "infantry"
  ],
  "supported": true
}
```

At `quantity: 7`, this entry costs `100 + (7 - 5) * 12 = 124` points before
applicable Upgrade costs.

### Invalid Cost Example

```json
{
  "id": "invalid-squad",
  "factionId": "death-guard",
  "name": "Invalid Squad",
  "baseCost": 100,
  "costModel": {
    "type": "per-model",
    "additionalModelCost": -2
  },
  "minSize": 5,
  "maxSize": 10,
  "tags": ["troops"],
  "supported": true
}
```

Negative and malformed costs are invalid.

---

## Relationships

```text
Faction
│
└── Unit
     │
     ├── Tags
     ├── Upgrades
     └── Rules
```

---

## Future Considerations

Potential future fields:

```json
{
  "availableUpgrades": [],
  "rules": [],
  "keywords": [],
  "availability": []
}
```

Support for these features should not require redesign of the existing schema.

---

## Validation Rules

### Required Fields

- id
- factionId
- name
- baseCost
- minSize
- maxSize
- tags
- supported

### Constraints

- minSize must be greater than zero
- maxSize must be greater than or equal to minSize
- baseCost must be greater than or equal to zero
- costModel must be one of `fixed`, `per-model`, or `size-tier`
- per-model `additionalModelCost` must be greater than or equal to zero
- size-tier ranges must cover minSize through maxSize without gaps or overlaps
- available upgrade IDs must exist
- available upgrade min must be at least zero
- available upgrade max must be greater than or equal to min
- tags must contain at least one value

### Referential Constraints

factionId must reference an existing Faction.

---

## Notes

The Unit schema is one of the foundational entities within Ledger Tactica.

Changes to the Unit schema should be considered carefully as they may impact upgrades, validation, roster construction and future rules engine functionality.
