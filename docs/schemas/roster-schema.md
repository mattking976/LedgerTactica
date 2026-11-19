# Roster Schema

## Purpose

A Roster represents a player-created army list.

It acts as the primary working document within Ledger Tactica and contains references to the Game, Faction and Units selected by the user.

A Roster should contain only user selections and state.

Game data should remain external and be referenced by identifiers.

---

## Responsibilities

A Roster is responsible for:

- Defining the selected game
- Defining the selected faction
- Tracking roster entries
- Tracking point limits
- Storing roster metadata
- Persisting user army lists

---

## Non-Responsibilities

A Roster should not contain:

- Unit definitions
- Upgrade definitions
- Rule definitions
- Validation logic
- Game metadata

These entities should be referenced through their identifiers.

---

## Design Principles

### Roster Data References Game Data

A Roster should reference existing entities.

#### Recommended

```json
{
  "gameId": "horus-heresy-3e"
}
```

#### Not Recommended

```json
{
  "gameName": "Horus Heresy",
  "version": "3rd Edition"
}
```

Duplicating data creates maintenance challenges.

---

### Roster State Is User Data

Only player-specific choices should be stored within a Roster.

---

### Roster Validation Is External

A roster should not contain validation logic.

Instead:

```text
Roster
↓
Validation Engine
↓
Validation Result
```

---

## Fields

| Field | Type | Required | Description |
|----------|----------|----------|----------|
| id | string | Yes | Unique roster identifier |
| name | string | Yes | User-defined roster name |
| gameId | string | Yes | Selected game |
| factionId | string | Yes | Selected faction |
| pointsLimit | number | Yes | Maximum roster points |
| rosterEntries | array | Yes | Selected units |
| supported | boolean | Yes | Active support flag |

---

## Example

```json
{
  "id": "roster-001",
  "name": "Death Guard Event List",
  "gameId": "horus-heresy-3e",
  "factionId": "death-guard",
  "pointsLimit": 3000,
  "rosterEntries": [],
  "supported": true
}
```

---

## Relationships

```text
Roster
│
├── Game Reference
├── Faction Reference
│
└── Roster Entries
```

---

## Validation Rules

### Required Fields

- id
- name
- gameId
- factionId
- pointsLimit
- rosterEntries

### Constraints

- pointsLimit must be greater than zero
- rosterEntries may be empty while a roster is being built

### Referential Constraints

- gameId must reference a valid Game
- factionId must reference a valid Faction

---

## Notes

The Roster schema represents the player's list rather than game data.

It should remain lightweight and only contain information specific to the user's army construction choices.
