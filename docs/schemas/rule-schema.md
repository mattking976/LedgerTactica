# Rule Schema

## Purpose

Rules represent validation and roster construction requirements.

Rules should be evaluated by the validation engine.

---

## Responsibilities

Rules are responsible for:

- Roster validation
- Construction restrictions
- Unlock requirements
- Eligibility checks

---

## Non-Responsibilities

Rules should not:

- Contain UI behaviour
- Store roster data
- Store faction data

---

## Design Principles

### Rules Are Data

Rules should be represented as configuration wherever possible.

Application code should evaluate rules rather than define them.

---

### Rules Operate On Tags

Rules should target tags rather than specific unit names.

This improves reuse and reduces game-specific implementation.

---

### Rules Must Be Generic

Rule types should be reusable across multiple game systems.

---

## Example

```json
{
  "id": "minimum-hq",
  "type": "minimum-tag-count",
  "tag": "hq",
  "value": 1
}
```

---

## Initial Rule Types

### minimum-tag-count

Requires a minimum number of matching tags.

### maximum-tag-count

Restricts the number of matching tags.

### required-tag

Requires the presence of a tag.

### prohibited-tag

Prevents a tag from appearing.

### points-limit

Requires a calculated roster cost to remain at or below a configured value.

### unlock-condition

Allows an upgrade or option only while a source tag condition is satisfied.

### maximum-duplicates

Restricts repeated selections of a named Unit or tagged Unit type.

---

## Future Rule Types

Examples:

- unit-ratio
- mutual-exclusion
- upgrade-restriction

These should be introduced only when required.

## Detailed Configuration

See [Validation Rule Schema](validation-rule-schema.md) for field definitions,
rule examples, validation result shape and cross-system extension guidance.
