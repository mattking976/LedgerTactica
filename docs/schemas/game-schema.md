# Game Schema

## Purpose

A Game represents a specific supported ruleset and edition within Ledger Tactica.

Examples include:

- Horus Heresy 2.0
- Horus Heresy 3.0
- Warhammer 40,000 8th Edition
- Warhammer 40,000 10th Edition
- Bolt Action 2nd Edition
- Bolt Action 3rd Edition

Each Game represents a unique rules environment and should be treated as an independent system by the application.

This approach allows Ledger Tactica to support legacy editions alongside current editions without introducing unnecessary complexity into the application architecture.

---

## Responsibilities

A Game is responsible for:

- Defining a supported ruleset
- Providing system metadata
- Defining version information
- Defining support status
- Acting as the parent entity for factions

---

## Non-Responsibilities

A Game should not contain:

- Unit definitions
- Upgrade definitions
- Player rosters
- Validation logic
- Individual faction rules

These responsibilities belong to other domain entities.

---

## Design Principles

### Editions Are Distinct Games

Ledger Tactica treats each edition as its own game definition.

#### Recommended

```json
{
  "id": "warhammer-40k-8e"
}
```

```json
{
  "id": "warhammer-40k-9e"
}
```

```json
{
  "id": "warhammer-40k-10e"
}
```

#### Not Recommended

```json
{
  "id": "warhammer-40k",
  "versions": [
    "8th Edition",
    "9th Edition",
    "10th Edition"
  ]
}
```

### Rationale

Different editions often contain:

- Different unit profiles
- Different point values
- Different force organisation rules
- Different faction structures
- Different validation requirements

Treating editions as independent games significantly simplifies both data management and validation logic.

---

### IDs Are Permanent

Every game must have a permanent unique identifier.

IDs should never change once published.

Application logic should reference IDs rather than display names.

#### Example

```json
{
  "id": "horus-heresy-3e"
}
```

User-facing display names may change without impacting application behaviour.

---

## Fields

| Field | Type | Required | Description |
|----------|----------|----------|----------|
| id | string | Yes | Permanent unique identifier |
| name | string | Yes | Display name |
| version | string | Yes | Rules edition/version |
| releaseDate | string (ISO 8601) | Yes | Official release date |
| status | string | Yes | Lifecycle state |
| supported | boolean | Yes | Actively maintained within Ledger Tactica |

---

## Field Definitions

### id

Unique identifier used internally throughout the application.

Examples:

```json
"horus-heresy-3e"
```

```json
"warhammer-40k-8e"
```

---

### name

Human-readable name displayed to users.

Examples:

```json
"Horus Heresy"
```

```json
"Warhammer 40,000"
```

---

### version

Represents the edition, rules package or version of the game.

Examples:

```json
"3rd Edition"
```

```json
"8th Edition"
```

```json
"2024 Rules"
```

---

### releaseDate

Official release date for the represented ruleset.

Format:

```json
"2026-01-01"
```

Stored using ISO 8601 date format.

---

### status

Represents the lifecycle state of the game definition.

Supported values:

```text
active
legacy
archived
```

Definitions:

| Status | Meaning |
|----------|----------|
| active | Current ruleset |
| legacy | Superseded but still supported |
| archived | No longer actively maintained |

---

### supported

Indicates whether Ledger Tactica actively supports and maintains the game definition.

Examples:

```json
true
```

```json
false
```

---

## Examples

### Current Ruleset

```json
{
  "id": "horus-heresy-3e",
  "name": "Horus Heresy",
  "version": "3rd Edition",
  "releaseDate": "2026-09-01",
  "status": "active",
  "supported": true
}
```

---

### Legacy Ruleset

```json
{
  "id": "warhammer-40k-8e",
  "name": "Warhammer 40,000",
  "version": "8th Edition",
  "releaseDate": "2017-06-17",
  "status": "legacy",
  "supported": true
}
```

---

### Archived Ruleset

```json
{
  "id": "warhammer-40k-7e",
  "name": "Warhammer 40,000",
  "version": "7th Edition",
  "releaseDate": "2014-05-24",
  "status": "archived",
  "supported": false
}
```

---

## Relationships

```text
Game
│
└── Faction
    │
    └── Unit
```

A Game owns one or more Factions.

Factions belonging to different Game records should be treated as independent entities, even when they represent a similar faction across editions.

Example:

```text
Death Guard (40K 8th Edition)

≠

Death Guard (40K 10th Edition)
```

---

## Future Considerations

The following fields are intentionally excluded from the MVP but may be introduced later:

```json
{
  "endOfLifeDate": null,
  "publisher": "",
  "website": "",
  "icon": "",
  "description": ""
}
```

These additions should not require modification of existing consumers.

---

## Validation Rules

The Game schema must satisfy the following constraints:

### Required Fields

- id
- name
- version
- releaseDate
- status
- supported

### Unique Constraints

- id must be unique across all games

### Allowed Values

status must be one of:

```text
active
legacy
archived
```

### Date Rules

releaseDate must be a valid ISO 8601 date.

---

## Notes

The Game schema forms the root of the Ledger Tactica domain hierarchy.

It should remain lightweight and primarily serve as a container for game identity and lifecycle metadata.

Game-specific behaviour should be driven by related entities and configuration rather than embedded directly within the Game definition itself.
