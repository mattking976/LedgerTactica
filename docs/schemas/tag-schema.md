# Tag Schema

## Purpose

Tags provide a flexible mechanism for classification, filtering and validation throughout Ledger Tactica.

Tags are designed to minimise game-specific logic within application code by allowing behaviour to be driven through data.

---

## Responsibilities

Tags are responsible for:

- Classification
- Army organisation
- Rules interaction
- Validation targeting
- Search and filtering

---

## Non-Responsibilities

Tags should not contain:

- Display logic
- Cost information
- Unit data
- Rule implementation

Tags identify information.

They do not own information.

---

## Design Principles

### Tags Are Data

Tags must be stored and maintained through data definitions.

Application code should not contain hardcoded tag definitions.

---

### Tags Are Reusable

A tag may be applied to:

- Units
- Upgrades
- Rules

---

### Tags Are Not Hierarchies

A tag should describe a characteristic.

It should not describe a parent-child structure.

---

## Categories

### Classification Tags

Examples:

```text
infantry
vehicle
character
tank
artillery
```

### Organisation Tags

Examples:

```text
hq
troops
elite
fast-attack
```

### Rules Tags

Examples:

```text
line
officer
master-of-legion
```

---

## Example

```json
[
  "hq",
  "character",
  "infantry",
  "line"
]
```

---

## Tag IDs

Tags use kebab-case IDs.

Good:

```text
infantry
hq
melee-weapon
master-of-legion
```

Avoid display names and abbreviations that may change or be ambiguous:

```text
HQ
Infantry
Master of Legion
```

Tag IDs should be defined consistently within a Game package. The same ID may have
different meanings in a different game package.

Examples:

- `hq` means a headquarters-style unit in one system
- `hq` means the same organisation concept in another system only if the rule semantics
  are intentionally compatible

Application code must not define or translate game-specific tags.

---

## Unit Tags

Units use tags for classification and rules targeting.

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
    "infantry",
    "master-of-legion"
  ],
  "supported": true
}
```

Every Unit must contain at least one tag.

Unit tags should describe stable characteristics, not instance-specific choices.
Selected upgrades remain separate from the Unit definition.

---

## Upgrade Tags

Upgrades use tags to describe what they add or replace.

```json
{
  "id": "paragon-blade",
  "name": "Paragon Blade",
  "category": "weapon",
  "cost": 25,
  "tags": [
    "melee-weapon",
    "replacement"
  ],
  "supported": true
}
```

Upgrade tags are optional in the Upgrade schema.

Use upgrade tags for restrictions and eligibility, such as:

- preventing incompatible upgrades
- unlocking an option
- matching a weapon category

Do not use upgrade tags to duplicate the Upgrade's cost or category.

---

## Rule Tags

Rules use tags as their target rather than Unit or Upgrade names.

```json
{
  "id": "minimum-hq",
  "type": "minimum-tag-count",
  "tag": "hq",
  "value": 1
}
```

A Rule target tag must match an exact tag declared on roster entries or their
corresponding entities. Validation engines must not contain lists of valid unit names.

Examples:

```json
{
  "type": "maximum-tag-count",
  "tag": "hq",
  "value": 2
}
```

```json
{
  "type": "required-tag",
  "tag": "character"
}
```

```json
{
  "type": "prohibited-tag",
  "tag": "super-heavy"
}
```

Future rule types may use multiple tags, but tag matching should remain explicit and
data-driven.

---

## Faction Tags

Factions may use tags to classify army identity or system-level characteristics.

```json
{
  "id": "death-guard",
  "gameId": "horus-heresy-3e",
  "name": "Death Guard",
  "tags": [
    "legiones-astartes",
    "chaos-corrupted"
  ],
  "supported": true
}
```

Faction tags are optional.

Use faction tags for:

- filtering factions
- faction-level eligibility
- system-wide classifications

Do not use faction tags for Unit details or rules that belong to individual Units.

---

## Matching Rules

Tag matching is exact and case-sensitive.

```text
hq matches hq
HQ does not match hq
infantry matches infantry
infantry-fighter does not match infantry
```

Tags are sets, not ordered lists. A tag should appear once in an entity's tag array.

When a rule requires multiple tags:

- A Unit matches a tag list if it contains every required tag.
- A Rule targeting a tag matches only Units or Upgrades that declare that exact tag.
- Validation quantities are calculated from Roster Entries, not from tag definitions.

Tags do not imply hierarchy:

- `character` does not imply `infantry`
- `hq` does not imply `character`
- `vehicle` does not imply `transport`

Relationships between tags must be represented by separate rules or data structures.

---

## Filtering

Clients may filter entities by tag using exact ID matches.

Examples:

```text
units?tag=hq
units?tag=infantry
upgrades?tag=melee-weapon
factions?tag=legiones-astartes
```

Multiple tags may be combined using one of these explicit query semantics:

- `match=any`: return entities containing at least one requested tag
- `match=all`: return entities containing every requested tag

The API implementation can choose a default only when it is documented consistently.
Filtering must not encode game-specific business rules.

---

## Validation Scenarios

Tags support validation without requiring application code to know specific entity names.

Examples:

| Scenario | Rule target | Roster data |
|----------|-------------|-------------|
| At least one HQ | `hq` | Units tagged `hq` |
| No duplicate named Unit | Unit ID | Roster Entry quantity |
| No super-heavy Units | `super-heavy` | Units tagged `super-heavy` |
| Character required | `character` | Units tagged `character` |
| Melee replacement available | `melee-weapon` | Upgrades tagged `melee-weapon` |

Duplicate quantity and tag count constraints must be evaluated against Roster Entries,
not by counting tag declarations on a Unit definition.

---

## Cross-System Usage

Tag IDs are reusable concepts, not assumptions about rulesets.

For example, any supported system may define a `vehicle` tag, but only the entities and
rules in that system determine how `vehicle` is used.

Cross-system compatibility requires:

- consistent kebab-case IDs
- documented tag meaning
- matching rule semantics
- game-specific definitions and values

No global application enum or game-specific branch is required.

---

## Notes

Tags are one of the primary mechanisms used by the validation engine.

Whenever possible, business logic should rely on tags rather than specific unit names.
