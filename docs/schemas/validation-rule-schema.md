# Validation Rule Schema

## Purpose

Validation rules describe roster construction restrictions as configuration.

The validation engine consumes these definitions and evaluates them against roster
data. Application code must not implement game-specific validation as branches based
on faction, unit or system names.

---

## Responsibilities

Validation rules are responsible for:

- Describing minimum and maximum selections
- Requiring or prohibiting tags
- Defining roster point limits
- Describing optional unlock conditions
- Producing validation errors with stable rule references

---

## Non-Responsibilities

Validation rules should not:

- Store roster selections
- Store unit or upgrade definitions
- Contain display or UI logic
- Duplicate faction or game metadata
- Implement validation behavior in application-specific branches

---

## Design Principles

### Rules Are Data

Rules belong to a Game package and are loaded with the rest of the game data.

```json
{
  "id": "minimum-hq",
  "type": "minimum-tag-count",
  "tag": "hq",
  "value": 1
}
```

### Rules Operate on Tags

Rules should normally identify units, upgrades or factions by tags rather than names.

Tag matching uses the exact, case-sensitive IDs defined in the
[Tag Schema](tag-schema.md).

Rules may reference entity IDs when an individual Unit or Upgrade is intentionally
restricted. Specific ID restrictions should be the exception, not the default.

### Rules Are Reusable

Rule types must remain independent of a particular game or faction.

For example, `minimum-tag-count` can apply to `hq`, `troops`, `rifle-infantry` or
another system-specific tag.

---

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Stable rule identifier |
| type | string | Yes | Validation rule implementation name |
| tag | string | For tag-based rules | Tag targeted by the rule |
| value | number | For numeric rules | Numeric threshold or limit |
| sourceTag | string | For unlock rules | Tag that activates the rule |
| targetTag | string | For unlock rules | Tag that becomes available |
| unitId | string | Optional | Restricts a rule to a Unit |
| upgradeId | string | Optional | Restricts a rule to an Upgrade |
| scope | string | No | Evaluation scope, such as `roster`, `faction` or `entry` |
| message | string | No | Optional human-readable validation detail |

Additional fields may be introduced by future rule types. Unknown fields must not
change the behavior of existing rule types.

---

## Rule Type Format

All rule types use kebab-case identifiers.

```text
minimum-tag-count
maximum-tag-count
required-tag
prohibited-tag
points-limit
unlock-condition
maximum-duplicates
unit-ratio
```

Application code dispatches from `type` to a generic rule implementation. It must not
inspect display names or embed tag lists for individual factions.

---

## Minimum Tag Count

Requires at least `value` selected Units or Roster Entries containing `tag`.

```json
{
  "id": "minimum-hq",
  "type": "minimum-tag-count",
  "tag": "hq",
  "value": 1
}
```

The example is valid when the roster contains one or more entries whose Unit definition
contains `hq`. In the MVP, `scope` defaults to `roster` and each matching Roster Entry
counts once, regardless of its model quantity. Unit tags are counted once per entry,
not once per tag occurrence.

`maximum-tag-count` uses the same counting semantics. Both tag-count rules may include
`unitId` to restrict the count to one Unit definition; they do not count Upgrade tags.

---

## Maximum Tag Count

Limits the number of selected Units or Roster Entries containing `tag` to `value`.

```json
{
  "id": "maximum-elites",
  "type": "maximum-tag-count",
  "tag": "elite",
  "value": 3
}
```

The scope must be explicit or consistently defaulted to `roster` when omitted.

---

## Maximum Duplicates

Limits repeated selections of the same Unit.

Where duplicate restrictions depend on a classification rather than a specific name,
`maximum-tag-count` is preferred.

Use an explicit `unitId` only when the rules concern one named Unit template:

```json
{
  "id": "maximum-legion-praetor",
  "type": "maximum-duplicates",
  "unitId": "legion-praetor",
  "value": 1
}
```

This rule counts Roster Entries referencing `legion-praetor`. It does not prohibit
different Unit definitions that happen to have the same display name. The MVP also
allows `tag` instead of `unitId` to count entries whose Unit has that tag. Exactly one
of these selectors is required, and entry `quantity` does not multiply the count.

---

## Required Tag

Requires at least one selected Unit or Upgrade containing `tag`.

```json
{
  "id": "require-character",
  "type": "required-tag",
  "tag": "character"
}
```

Required tags are useful for detached gameplay concepts, but they must not be used as
substitutes for explicit tag semantics or hierarchy.

By default, this checks tags on selected Units and Upgrades. `unitId` or `upgradeId`
may restrict the check to one entity type. With `scope: "faction"`, the rule checks
the selected Faction's tags instead.

---

## Prohibited Tag

Prevents matching Units or Upgrades from being selected.

It uses the same `scope`, `unitId`, and `upgradeId` behavior as `required-tag`.

```json
{
  "id": "prohibit-super-heavy",
  "type": "prohibited-tag",
  "tag": "super-heavy"
}
```

---

## Points Limit

Validates that the calculated roster cost does not exceed `value`.

```json
{
  "id": "roster-points-limit",
  "type": "points-limit",
  "value": 3000
}
```

The points engine supplies the calculated points total. The validation engine compares
that result to the rule; it must not implement points calculation itself.

The `pointsLimit` field on a Roster may provide the player-selected limit. A rule can
also define a system or format limit. When both exist, the stricter applicable limit
applies; the engine reports both source values unchanged.

---

## Unlock Condition

Makes an option available only while a source condition is satisfied.

```json
{
  "id": "unlock-extra-melee-weapon",
  "type": "unlock-condition",
  "sourceTag": "character",
  "targetTag": "melee-weapon",
  "scope": "entry"
}
```

An unlock rule is satisfied when the selected Unit or Roster Entry contains
`sourceTag`. It permits selection of entities or options containing `targetTag`.

The MVP defaults `scope` to `roster`, allowing a source-tagged Unit anywhere in the
Roster to unlock a selected Unit or Upgrade with `targetTag`. `scope: "entry"` requires
the source and selected target to occur on the same Roster Entry. `scope: "faction"`
checks `sourceTag` on the selected Faction. Optional `unitId` and `upgradeId` narrow
the source Unit and target Upgrade respectively.

Unlock conditions should describe data relationships. They must not encode UI visibility
or require an application to know a specific named upgrade.

Future unlock formats may add numeric thresholds or multiple conditions. Existing fields
must remain backward compatible.

---

## Unit Ratio

Requires a ratio between two tag groups.

```json
{
  "id": "rifle-section-ratio",
  "type": "unit-ratio",
  "sourceTag": "hq",
  "targetTag": "rifle-section",
  "value": 1
}
```

This example represents the rule format only; ratio semantics and rounding must be
defined by the implementation before this rule type is enabled.

---

## Horus Heresy 3rd Edition Examples

Minimum HQ selection:

```json
{
  "id": "hh3-minimum-hq",
  "type": "minimum-tag-count",
  "tag": "hq",
  "value": 1
}
```

Maximum duplicated HQ Unit:

```json
{
  "id": "hh3-maximum-duplicate-hq",
  "type": "maximum-tag-count",
  "tag": "hq",
  "value": 2
}
```

Character unlocks an additional melee weapon:

```json
{
  "id": "hh3-character-melee-unlock",
  "type": "unlock-condition",
  "sourceTag": "character",
  "targetTag": "melee-weapon",
  "scope": "entry"
}
```

---

## Bolt Action 3rd Edition Examples

Minimum Rifle Infantry:

```json
{
  "id": "ba3-minimum-rifle-infantry",
  "type": "minimum-tag-count",
  "tag": "rifle-infantry",
  "value": 1
}
```

Maximum Officer selections:

```json
{
  "id": "ba3-maximum-officers",
  "type": "maximum-tag-count",
  "tag": "officer",
  "value": 3
}
```

Unit points limit:

```json
{
  "id": "ba3-roster-points-limit",
  "type": "points-limit",
  "value": 1000
}
```

These examples demonstrate cross-system reuse of the same rule types. Tag IDs and
numeric values come from each Game package.

---

## Validation Result

The validation engine should return rule outcomes in a stable, data-independent shape:

```json
{
  "ruleId": "minimum-hq",
  "valid": false,
  "message": "At least 1 Unit tagged hq is required."
}
```

The `ruleId` allows documentation and callers to identify the failing rule. The
`message` may be supplied by the rule or generated from rule fields.

Game-specific display text may be added later but must not be required for validation.
Unsupported rule types return `valid: false` with `code: "unsupported-rule"`. Invalid
roster or catalog references return an explicit validation error instead of a partial
success report.

---

## Extensibility

New rule types may be added without rewriting existing engine implementations.

Each addition should define:

- A kebab-case `type`
- Required and optional fields
- Evaluation scope
- Counting semantics
- Validation result behavior
- Representative cross-system examples

Unknown rule types must produce a clear unsupported-rule result, not silently pass.
Existing rule definitions must remain valid when fields are added by a later rule type.

Prefer introducing a new generic rule type over adding game-specific fields or
game-specific branches.

---

## Notes

Validation is evaluated from Roster data and referenced Game data. Rules operate against
tags first and Unit or Upgrade IDs only when necessary.
