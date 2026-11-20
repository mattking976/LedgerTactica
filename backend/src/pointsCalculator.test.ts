import { describe, expect, it } from "vitest"
import {
  calculateEntryCost,
  calculateRosterTotal,
} from "./services/pointsCalculator.ts"
import type {
  PointsCalculationErrorCode,
  PointsCalculationResult,
  PointsCatalog,
} from "./types/points.ts"
import type { Roster, RosterEntry } from "./types/roster.ts"

const catalog: PointsCatalog = {
  units: [
    {
      id: "fixed-unit",
      baseCost: 150,
      minSize: 1,
      maxSize: 1,
    },
    {
      id: "per-model-unit",
      baseCost: 100,
      minSize: 5,
      maxSize: 10,
      costModel: {
        type: "per-model",
        additionalModelCost: 12,
      },
      availableUpgrades: [
        { upgradeId: "selected-upgrade", min: 0, max: 5 },
        { upgradeId: "all-model-upgrade", min: 0, max: 1 },
        { upgradeId: "required-upgrade", min: 1, max: 1 },
        { upgradeId: "orphan-upgrade", min: 0, max: 1 },
      ],
    },
    {
      id: "tiered-unit",
      baseCost: 80,
      minSize: 5,
      maxSize: 10,
      costModel: {
        type: "size-tier",
        tiers: [
          { minSize: 5, maxSize: 7, cost: 80 },
          { minSize: 8, maxSize: 10, cost: 140 },
        ],
      },
    },
  ],
  upgrades: [
    { id: "selected-upgrade", cost: 5 },
    { id: "all-model-upgrade", cost: 3, costModel: "per-model" },
    { id: "required-upgrade", cost: 0 },
    { id: "unused-upgrade", cost: 1 },
  ],
}

const makeEntry = (
  unitId: string,
  quantity: number,
  selectedUpgrades: RosterEntry["selectedUpgrades"] = [],
): RosterEntry => ({
  id: "entry-1",
  unitId,
  quantity,
  selectedUpgrades,
})

const expectFailure = <T>(
  result: PointsCalculationResult<T>,
  code: PointsCalculationErrorCode,
) => {
  if (result.ok) {
    throw new Error(`Expected calculation to fail with "${code}"`)
  }
  expect(result.error.code).toBe(code)
}

describe("points calculator", () => {
  it("calculates fixed-size and default fixed costs", () => {
    expect(calculateEntryCost(makeEntry("fixed-unit", 1), catalog)).toEqual({
      ok: true,
      value: 150,
    })
  })

  it("calculates variable-size and size-tier unit costs", () => {
    expect(
      calculateEntryCost(
        makeEntry("per-model-unit", 7, [
          { upgradeId: "required-upgrade", quantity: 1 },
        ]),
        catalog,
      ),
    ).toEqual({ ok: true, value: 124 })
    expect(calculateEntryCost(makeEntry("tiered-unit", 6), catalog)).toEqual({
      ok: true,
      value: 80,
    })
    expect(calculateEntryCost(makeEntry("tiered-unit", 9), catalog)).toEqual({
      ok: true,
      value: 140,
    })
  })

  it("calculates per-selection and all-model Upgrade costs", () => {
    expect(
      calculateEntryCost(
        makeEntry("per-model-unit", 7, [
          { upgradeId: "selected-upgrade", quantity: 3 },
          { upgradeId: "all-model-upgrade", quantity: 1 },
          { upgradeId: "required-upgrade", quantity: 1 },
        ]),
        catalog,
      ),
    ).toEqual({ ok: true, value: 100 + 2 * 12 + 3 * 5 + 7 * 3 })
  })

  it("sums entry costs without applying the roster points limit", () => {
    const roster: Roster = {
      id: "roster-1",
      name: "Test roster",
      gameId: "sample-game",
      factionId: "sample-faction",
      pointsLimit: 100,
      rosterEntries: [
        makeEntry("fixed-unit", 1),
        makeEntry("per-model-unit", 7, [
          { upgradeId: "required-upgrade", quantity: 1 },
        ]),
      ],
      supported: true,
    }

    expect(calculateRosterTotal(roster, catalog)).toEqual({
      ok: true,
      value: 150 + 124,
    })
  })

  it("returns explicit errors for missing definitions and invalid entries", () => {
    expectFailure(
      calculateEntryCost(makeEntry("missing-unit", 1), catalog),
      "unit-not-found",
    )
    expectFailure(
      calculateEntryCost(makeEntry("per-model-unit", 0), catalog),
      "invalid-entry",
    )
    expectFailure(
      calculateEntryCost(makeEntry("per-model-unit", 11), catalog),
      "invalid-entry",
    )
    expectFailure(
      calculateEntryCost(
        makeEntry("per-model-unit", 5, [
          { upgradeId: "missing-upgrade", quantity: 1 },
        ]),
        catalog,
      ),
      "invalid-upgrade-selection",
    )
    expectFailure(
      calculateEntryCost(
        makeEntry("per-model-unit", 5, [
          { upgradeId: "unused-upgrade", quantity: 1 },
        ]),
        catalog,
      ),
      "invalid-upgrade-selection",
    )
    expectFailure(
      calculateEntryCost(
        makeEntry("per-model-unit", 5, [
          { upgradeId: "orphan-upgrade", quantity: 1 },
        ]),
        catalog,
      ),
      "upgrade-not-found",
    )
    expectFailure(
      calculateEntryCost(
        makeEntry("per-model-unit", 5, [
          { upgradeId: "selected-upgrade", quantity: 6 },
        ]),
        catalog,
      ),
      "invalid-upgrade-selection",
    )
    expectFailure(
      calculateEntryCost(makeEntry("per-model-unit", 5), catalog),
      "invalid-upgrade-selection",
    )
  })

  it("rejects malformed or unsupported cost models", () => {
    const badUnitCatalog: PointsCatalog = {
      ...catalog,
      units: [
        {
          ...catalog.units[0],
          baseCost: -1,
        },
      ],
    }
    expectFailure(
      calculateEntryCost(makeEntry("fixed-unit", 1), badUnitCatalog),
      "invalid-unit-cost",
    )

    const unknownModelCatalog: PointsCatalog = {
      ...catalog,
      units: [
        {
          ...catalog.units[0],
          costModel: { type: "unknown" },
        },
      ],
    }
    expectFailure(
      calculateEntryCost(makeEntry("fixed-unit", 1), unknownModelCatalog),
      "invalid-unit-cost-model",
    )

    const unknownUpgradeModelCatalog: PointsCatalog = {
      ...catalog,
      units: catalog.units.map((unit) =>
        unit.id === "per-model-unit"
          ? {
              ...unit,
              availableUpgrades: [
                ...(unit.availableUpgrades ?? []),
                { upgradeId: "unknown-model-upgrade", min: 0, max: 1 },
              ],
            }
          : unit,
      ),
      upgrades: [
        ...catalog.upgrades,
        { id: "unknown-model-upgrade", cost: 1, costModel: "unknown" },
      ],
    }
    expectFailure(
      calculateEntryCost(
        makeEntry("per-model-unit", 5, [
          { upgradeId: "unknown-model-upgrade", quantity: 1 },
          { upgradeId: "required-upgrade", quantity: 1 },
        ]),
        unknownUpgradeModelCatalog,
      ),
      "invalid-upgrade-cost-model",
    )
  })
})
