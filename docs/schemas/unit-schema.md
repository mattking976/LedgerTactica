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
| baseCost | number | Yes | Base points cost |
| minSize | number | Yes | Minimum models |
| maxSize | number | Yes | Maximum models |
| tags | string[] | Yes | Classification tags |
| supported | boolean | Yes | Active support status |

---

## Example

```json
{
  "id": "legion-praetor",
  "factionId": "death-guard",
  "name": "Praetor",
  "baseCost": 150,
  "minSize": 1,
  "maxSize": 1,
  "tags": [
    "hq",
    "character",
    "master-of-legion"
  ],
  "supported": true
}
```

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
- tags must contain at least one value

### Referential Constraints

factionId must reference an existing Faction.

---

## Notes

The Unit schema is one of the foundational entities within Ledger Tactica.

Changes to the Unit schema should be considered carefully as they may impact upgrades, validation, roster construction and future rules engine functionality.
