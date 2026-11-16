# Faction Schema

## Purpose

A Faction represents a playable army identity within a specific Game definition.

Examples include:

- Death Guard
- Imperial Fists
- Solar Auxilia
- Mechanicum
- British Army
- German Army
- United States Army

A Faction serves as the organisational container for Units belonging to a specific army.

A Faction should only represent army identity.

Army construction modifiers such as Rites of War, Detachments, Force Organisation Charts, Theatres of War and similar concepts should be represented separately from the Faction itself.

---

## Responsibilities

A Faction is responsible for:

- Defining army identity
- Providing faction metadata
- Acting as the parent entity for Units
- Providing faction-level categorisation

---

## Non-Responsibilities

A Faction should not contain:

- Unit definitions
- Upgrade definitions
- Validation logic
- Rules engine behaviour
- Detachments
- Rites of War
- Formation definitions
- Theatres of War

These concepts should be modelled independently.

---

## Design Principles

### Factions Represent Identity

Factions should remain stable regardless of list construction options.

#### Recommended

```json
{
  "id": "death-guard"
}
```

and

```json
{
  "id": "the-reaping"
}
```

represented as a separate army construction option.

#### Not Recommended

```json
{
  "id": "death-guard-the-reaping"
}
```

This approach creates duplication and maintenance overhead.

---

### Factions Belong To One Game

A Faction belongs to a single Game definition.

For example:

```text
Death Guard (40K 8th Edition)

≠

Death Guard (40K 10th Edition)
```

These should be treated as independent implementations.

---

## Fields

| Field | Type | Required | Description |
|----------|----------|----------|----------|
| id | string | Yes | Unique faction identifier |
| gameId | string | Yes | Parent game |
| name | string | Yes | Display name |
| tags | string[] | No | Classification tags |
| supported | boolean | Yes | Supported in Ledger Tactica |

---

## Example

```json
{
  "id": "death-guard",
  "gameId": "horus-heresy-3e",
  "name": "Death Guard",
  "tags": [
    "legiones-astartes"
  ],
  "supported": true
}
```

---

## Relationships

```text
Game
│
└── Faction
     │
     └── Units
```

A Faction belongs to exactly one Game.

A Faction may contain multiple Units.

---

## Future Considerations

Potential future fields:

```json
{
  "description": "",
  "icon": "",
  "parentFaction": "",
  "subFaction": ""
}
```

Support for hierarchical faction structures should not require modification of existing consumers.

---

## Validation Rules

### Required Fields

- id
- gameId
- name
- supported

### Unique Constraints

Faction IDs must be unique within a Game.

### Referential Constraints

gameId must reference an existing Game.

---

## Notes

A Faction should remain a lightweight organisational construct.

Army configuration and validation behaviour should be driven by Rules rather than embedded directly into Faction definitions.
