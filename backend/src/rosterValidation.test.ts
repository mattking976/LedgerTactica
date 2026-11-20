import { describe, expect, it } from "vitest"
import { validateRoster } from "./services/rosterValidation.ts"
import type { Roster, RosterEntry } from "./types/roster.ts"
import type {
  PointsTotal,
  RosterValidationErrorCode,
  RosterValidationResult,
  ValidationCatalog,
  ValidationRuleDefinition,
} from "./types/validation.ts"

const catalog: ValidationCatalog = {
  gameId: "sample-game",
  factions: [
    {
      id: "sample-faction",
      gameId: "sample-game",
      name: "Sample Faction",
      tags: ["sample-faction"],
      supported: true,
    },
    {
      id: "another-faction",
      gameId: "sample-game",
      name: "Another Faction",
      tags: [],
      supported: true,
    },
  ],
  units: [
    {
      id: "sample-line",
      factionId: "sample-faction",
      name: "Sample Line",
      baseCost: 100,
      costModel: { type: "per-model", additionalModelCost: 10 },
      minSize: 5,
      maxSize: 10,
      availableUpgrades: [
        { upgradeId: "optional-kit", min: 0, max: 5 },
        { upgradeId: "all-model-toggle", min: 0, max: 1 },
        { upgradeId: "melee-option", min: 0, max: 1 },
      ],
      tags: ["troops", "sample"],
      supported: true,
    },
    {
      id: "sample-character",
      factionId: "sample-faction",
      name: "Sample Character",
      baseCost: 150,
      minSize: 1,
      maxSize: 1,
      tags: ["hq", "character"],
      supported: true,
    },
    {
      id: "foreign-unit",
      factionId: "another-faction",
      name: "Foreign Unit",
      baseCost: 50,
      minSize: 1,
      maxSize: 1,
      tags: ["sample"],
      supported: true,
    },
  ],
  upgrades: [
    {
      id: "optional-kit",
      name: "Optional Kit",
      cost: 5,
      costModel: "flat",
      tags: ["wargear"],
      supported: true,
    },
    {
      id: "all-model-toggle",
      name: "All-Model Toggle",
      cost: 3,
      costModel: "per-model",
      tags: ["replacement"],
      supported: true,
    },
    {
      id: "melee-option",
      name: "Melee Option",
      cost: 10,
      tags: ["melee-weapon"],
      supported: true,
    },
  ],
  rules: [],
}

const makeRoster = (rosterEntries: RosterEntry[] = []): Roster => ({
  id: "roster-1",
  name: "Test roster",
  gameId: "sample-game",
  factionId: "sample-faction",
  pointsLimit: 200,
  rosterEntries,
  supported: true,
})

const lineEntry = (
  id: string,
  selectedUpgrades: RosterEntry["selectedUpgrades"] = [],
  quantity = 7,
): RosterEntry => ({
  id,
  unitId: "sample-line",
  quantity,
  selectedUpgrades,
})

const successfulPoints = (value: number): PointsTotal => ({
  ok: true,
  value,
})

const withRules = (
  rules: ValidationRuleDefinition[],
): ValidationCatalog => ({ ...catalog, rules })

const expectFailure = (
  result: RosterValidationResult,
  code: RosterValidationErrorCode,
) => {
  if (result.ok) {
    throw new Error(`Expected validation to fail with "${code}"`)
  }
  expect(result.error.code).toBe(code)
}

describe("roster validation", () => {
  it("evaluates tag, duplicate, and points rules using the supplied points total", () => {
    const roster = makeRoster([
      lineEntry("entry-1", [
        { upgradeId: "optional-kit", quantity: 2 },
        { upgradeId: "all-model-toggle", quantity: 1 },
      ]),
    ])
    const rules: ValidationRuleDefinition[] = [
      { id: "minimum-troops", type: "minimum-tag-count", tag: "troops", value: 1 },
      { id: "maximum-troops", type: "maximum-tag-count", tag: "troops", value: 1 },
      { id: "no-hq", type: "maximum-tag-count", tag: "hq", value: 0 },
      { id: "require-replacement", type: "required-tag", tag: "replacement" },
      {
        id: "require-faction-tag",
        type: "required-tag",
        tag: "sample-faction",
        scope: "faction",
      },
      { id: "no-super-heavy", type: "prohibited-tag", tag: "super-heavy" },
      {
        id: "one-line-entry",
        type: "maximum-duplicates",
        unitId: "sample-line",
        value: 1,
      },
      { id: "points-limit", type: "points-limit", value: 150 },
    ]

    const result = validateRoster(
      roster,
      withRules(rules),
      successfulPoints(151),
    )

    expect(result).toEqual({
      ok: true,
      value: {
        valid: false,
        results: [
          {
            ruleId: "minimum-troops",
            valid: true,
            message: 'Found 1 roster entry tagged "troops"; minimum is 1.',
          },
          {
            ruleId: "maximum-troops",
            valid: true,
            message: 'Found 1 roster entry tagged "troops"; maximum is 1.',
          },
          {
            ruleId: "no-hq",
            valid: true,
            message: 'Found 0 roster entries tagged "hq"; maximum is 0.',
          },
          {
            ruleId: "require-replacement",
            valid: true,
            message: 'Required tag "replacement" is present in the selected roster.',
          },
          {
            ruleId: "require-faction-tag",
            valid: true,
            message: 'Required tag "sample-faction" is present in the selected Faction.',
          },
          {
            ruleId: "no-super-heavy",
            valid: true,
            message: 'No selected Unit or Upgrade has prohibited tag "super-heavy".',
          },
          {
            ruleId: "one-line-entry",
            valid: true,
            message: 'Found 1 entry for Unit "sample-line"; maximum is 1.',
          },
          {
            ruleId: "points-limit",
            valid: false,
            message: "Roster total 151 exceeds the applicable limit of 150 (roster limit 200, rule limit 150).",
          },
        ],
      },
    })
  })

  it("counts roster entries for tag limits and duplicate rules", () => {
    const roster = makeRoster([
      lineEntry("entry-1", [], 10),
      lineEntry("entry-2", [], 5),
    ])
    const result = validateRoster(
      roster,
      withRules([
        { id: "minimum-hq", type: "minimum-tag-count", tag: "hq", value: 1 },
        { id: "maximum-troops", type: "maximum-tag-count", tag: "troops", value: 1 },
        { id: "prohibit-troops", type: "prohibited-tag", tag: "troops" },
        {
          id: "maximum-lines",
          type: "maximum-duplicates",
          unitId: "sample-line",
          value: 1,
        },
        {
          id: "maximum-line-tag",
          type: "maximum-duplicates",
          tag: "troops",
          value: 1,
        },
      ]),
      successfulPoints(200),
    )

    if (!result.ok) {
      throw new Error(result.error.message)
    }
    expect(result.value.results.map(({ valid }) => valid)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ])
  })

  it("applies the stricter of the roster and rule points limits", () => {
    const roster = { ...makeRoster(), pointsLimit: 100 }
    const result = validateRoster(
      roster,
      withRules([{ id: "system-limit", type: "points-limit", value: 300 }]),
      successfulPoints(101),
    )

    expect(result).toEqual({
      ok: true,
      value: {
        valid: false,
        results: [
          {
            ruleId: "system-limit",
            valid: false,
            message: "Roster total 101 exceeds the applicable limit of 100 (roster limit 100, rule limit 300).",
          },
        ],
      },
    })
  })

  it("requires unlock source tags in the configured scope", () => {
    const roster = makeRoster([
      {
        id: "character-entry",
        unitId: "sample-character",
        quantity: 1,
        selectedUpgrades: [],
      },
      lineEntry("line-entry", [{ upgradeId: "melee-option", quantity: 1 }]),
    ])
    const rosterScopeRule: ValidationRuleDefinition = {
      id: "unlock-melee",
      type: "unlock-condition",
      sourceTag: "character",
      targetTag: "melee-weapon",
    }
    const unitUnlockRule: ValidationRuleDefinition = {
      id: "unlock-troops",
      type: "unlock-condition",
      sourceTag: "character",
      targetTag: "troops",
    }
    const entryScopeRule = { ...rosterScopeRule, scope: "entry" }
    const entryUnitUnlockRule = { ...unitUnlockRule, scope: "entry" }

    const rosterScopeResult = validateRoster(
      roster,
      withRules([rosterScopeRule, unitUnlockRule]),
      successfulPoints(200),
    )
    const entryScopeResult = validateRoster(
      roster,
      withRules([entryScopeRule, entryUnitUnlockRule]),
      successfulPoints(200),
    )

    expect(rosterScopeResult.ok && rosterScopeResult.value.valid).toBe(true)
    expect(
      entryScopeResult.ok &&
        entryScopeResult.value.results.map(({ valid }) => valid),
    ).toEqual([false, false])
  })

  it("returns explicit errors for ineligible units and unavailable upgrades", () => {
    expectFailure(
      validateRoster(
        makeRoster([{
          id: "foreign-entry",
          unitId: "foreign-unit",
          quantity: 1,
          selectedUpgrades: [],
        }]),
        catalog,
        successfulPoints(50),
      ),
      "unit-not-eligible",
    )
    expectFailure(
      validateRoster(
        makeRoster([{
          id: "character-entry",
          unitId: "sample-character",
          quantity: 1,
          selectedUpgrades: [{ upgradeId: "optional-kit", quantity: 1 }],
        }]),
        catalog,
        successfulPoints(155),
      ),
      "upgrade-not-available",
    )
  })

  it("reports unsupported rules and propagates points-calculation errors", () => {
    const unsupported = validateRoster(
      makeRoster(),
      withRules([{ id: "future-rule", type: "unit-ratio" }]),
      successfulPoints(0),
    )
    expect(unsupported).toEqual({
      ok: true,
      value: {
        valid: false,
        results: [
          {
            ruleId: "future-rule",
            valid: false,
            message: 'Rule type "unit-ratio" is not supported',
            code: "unsupported-rule",
          },
        ],
      },
    })

    expectFailure(
      validateRoster(makeRoster(), catalog, {
        ok: false,
        error: {
          code: "invalid-entry",
          message: "Entry has an invalid size",
        },
      }),
      "points-calculation-failed",
    )
    expectFailure(
      validateRoster(
        makeRoster(),
        withRules([
          { id: "invalid-rule", type: "minimum-tag-count", tag: "troops" },
        ]),
        successfulPoints(0),
      ),
      "invalid-rule",
    )
  })
})
