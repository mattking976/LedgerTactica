import { describe, expect, it } from "vitest"
import {
  addRosterEntry,
  createRoster,
  removeRosterEntry,
  setRosterEntryUpgrades,
  updateRosterEntryQuantity,
} from "./services/rosterOperations.ts"
import type {
  Roster,
  RosterCatalog,
  RosterOperationErrorCode,
  RosterResult,
} from "./types/roster.ts"

const catalog: RosterCatalog = {
  gameId: "sample-game",
  factionIds: ["sample-faction"],
  units: [
    {
      id: "sample-squad",
      factionId: "sample-faction",
      minSize: 5,
      maxSize: 10,
      availableUpgrades: [
        { upgradeId: "optional-weapon", min: 0, max: 1 },
        { upgradeId: "required-banner", min: 1, max: 2 },
      ],
    },
    {
      id: "other-faction-unit",
      factionId: "another-faction",
      minSize: 1,
      maxSize: 1,
    },
  ],
  upgradeIds: [
    "optional-weapon",
    "required-banner",
    "unused-upgrade",
  ],
}

const createTestRoster = (): Roster => {
  const result = createRoster(
    {
      name: "  Test Roster  ",
      gameId: "sample-game",
      factionId: "sample-faction",
      pointsLimit: 2000,
    },
    catalog,
    () => "roster-id",
  )

  if (!result.ok) {
    throw new Error(result.error.message)
  }
  return result.value
}

const expectFailure = <T>(
  result: RosterResult<T>,
  code: RosterOperationErrorCode,
) => {
  if (result.ok) {
    throw new Error(`Expected operation to fail with "${code}"`)
  }
  expect(result.error.code).toBe(code)
}

describe("roster operations", () => {
  it("creates an empty roster with canonical game and faction references", () => {
    const roster = createTestRoster()

    expect(roster).toEqual({
      id: "roster-id",
      name: "Test Roster",
      gameId: "sample-game",
      factionId: "sample-faction",
      pointsLimit: 2000,
      rosterEntries: [],
      supported: true,
    })
  })

  it("returns explicit errors for invalid roster fields and references", () => {
    expectFailure(
      createRoster(
        {
          name: "Roster",
          gameId: "missing-game",
          factionId: "sample-faction",
          pointsLimit: 2000,
        },
        catalog,
      ),
      "invalid-game",
    )
    expectFailure(
      createRoster(
        {
          name: "Roster",
          gameId: "sample-game",
          factionId: "missing-faction",
          pointsLimit: 2000,
        },
        catalog,
      ),
      "invalid-faction",
    )
    expectFailure(
      createRoster(
        {
          name: " ",
          gameId: "sample-game",
          factionId: "sample-faction",
          pointsLimit: 2000,
        },
        catalog,
      ),
      "invalid-name",
    )
    expectFailure(
      createRoster(
        {
          name: "Roster",
          gameId: "sample-game",
          factionId: "sample-faction",
          pointsLimit: 0,
        },
        catalog,
      ),
      "invalid-points-limit",
    )
  })

  it("adds distinct entries and edits or removes them by stable ID", () => {
    const roster = createTestRoster()
    const first = addRosterEntry(
      roster,
      catalog,
      "sample-squad",
      5,
      [{ upgradeId: "required-banner", quantity: 1 }],
      () => "entry-1",
    )
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = addRosterEntry(
      first.value,
      catalog,
      "sample-squad",
      6,
      [{ upgradeId: "required-banner", quantity: 1 }],
      () => "entry-2",
    )
    expect(second.ok).toBe(true)
    if (!second.ok) return

    const updated = updateRosterEntryQuantity(
      second.value,
      catalog,
      "entry-2",
      10,
    )
    expect(updated.ok).toBe(true)
    if (!updated.ok) return

    const removed = removeRosterEntry(updated.value, "entry-1")
    expect(removed.ok).toBe(true)
    if (!removed.ok) return

    expect(roster.rosterEntries).toEqual([])
    expect(removed.value.rosterEntries).toEqual([
      {
        id: "entry-2",
        unitId: "sample-squad",
        quantity: 10,
        selectedUpgrades: [{ upgradeId: "required-banner", quantity: 1 }],
      },
    ])
  })

  it("rejects unknown or ineligible Units and invalid sizes", () => {
    const roster = createTestRoster()

    expectFailure(
      addRosterEntry(roster, catalog, "missing-unit", 5),
      "invalid-unit",
    )
    expectFailure(
      addRosterEntry(roster, catalog, "other-faction-unit", 1),
      "unit-not-eligible",
    )
    expectFailure(
      addRosterEntry(roster, catalog, "sample-squad", 0),
      "invalid-quantity",
    )
    expectFailure(
      addRosterEntry(roster, catalog, "sample-squad", 4),
      "unit-size-out-of-range",
    )
    expectFailure(
      addRosterEntry(roster, catalog, "sample-squad", 11),
      "unit-size-out-of-range",
    )
    expectFailure(
      addRosterEntry(roster, catalog, "sample-squad", 5.5),
      "invalid-quantity",
    )
  })

  it("rejects edits against a catalog for a different game", () => {
    const roster = createTestRoster()
    const withEntry = addRosterEntry(
      roster,
      catalog,
      "sample-squad",
      5,
      [{ upgradeId: "required-banner", quantity: 1 }],
      () => "entry-1",
    )
    expect(withEntry.ok).toBe(true)
    if (!withEntry.ok) return

    expectFailure(
      updateRosterEntryQuantity(
        withEntry.value,
        { ...catalog, gameId: "another-game" },
        "entry-1",
        6,
      ),
      "invalid-game",
    )
  })

  it("validates eligible Upgrade IDs, quantities, duplicates, and requirements", () => {
    const roster = createTestRoster()
    const withEntry = addRosterEntry(
      roster,
      catalog,
      "sample-squad",
      5,
      [{ upgradeId: "required-banner", quantity: 1 }],
      () => "entry-1",
    )
    expect(withEntry.ok).toBe(true)
    if (!withEntry.ok) return

    const validSelection = setRosterEntryUpgrades(
      withEntry.value,
      catalog,
      "entry-1",
      [
        { upgradeId: "required-banner", quantity: 2 },
        { upgradeId: "optional-weapon", quantity: 1 },
      ],
    )
    expect(validSelection.ok).toBe(true)
    if (!validSelection.ok) return
    expect(validSelection.value.rosterEntries[0].selectedUpgrades).toEqual([
      { upgradeId: "required-banner", quantity: 2 },
      { upgradeId: "optional-weapon", quantity: 1 },
    ])

    expectFailure(
      setRosterEntryUpgrades(withEntry.value, catalog, "entry-1", []),
      "required-upgrade-missing",
    )
    expectFailure(
      setRosterEntryUpgrades(withEntry.value, catalog, "entry-1", [
        { upgradeId: "missing-upgrade", quantity: 1 },
      ]),
      "unknown-upgrade",
    )
    expectFailure(
      setRosterEntryUpgrades(withEntry.value, catalog, "entry-1", [
        { upgradeId: "unused-upgrade", quantity: 1 },
      ]),
      "upgrade-not-available",
    )
    expectFailure(
      setRosterEntryUpgrades(withEntry.value, catalog, "entry-1", [
        { upgradeId: "required-banner", quantity: 3 },
      ]),
      "upgrade-quantity-out-of-range",
    )
    expectFailure(
      setRosterEntryUpgrades(withEntry.value, catalog, "entry-1", [
        { upgradeId: "required-banner", quantity: 1 },
        { upgradeId: "required-banner", quantity: 1 },
      ]),
      "duplicate-upgrade-selection",
    )
    expectFailure(
      setRosterEntryUpgrades(withEntry.value, catalog, "entry-1", [
        { upgradeId: "required-banner", quantity: 0 },
      ]),
      "invalid-upgrade-quantity",
    )
  })

  it("rejects missing roster entries and duplicate generated IDs", () => {
    const roster = createTestRoster()
    const withEntry = addRosterEntry(
      roster,
      catalog,
      "sample-squad",
      5,
      [{ upgradeId: "required-banner", quantity: 1 }],
      () => "entry-1",
    )
    expect(withEntry.ok).toBe(true)
    if (!withEntry.ok) return

    expectFailure(removeRosterEntry(withEntry.value, "missing-entry"), "entry-not-found")
    expectFailure(
      updateRosterEntryQuantity(withEntry.value, catalog, "missing-entry", 5),
      "entry-not-found",
    )
    expectFailure(
      addRosterEntry(
        withEntry.value,
        catalog,
        "sample-squad",
        5,
        [{ upgradeId: "required-banner", quantity: 1 }],
        () => "entry-1",
      ),
      "duplicate-generated-id",
    )
  })
})
