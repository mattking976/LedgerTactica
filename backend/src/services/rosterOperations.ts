import { randomUUID } from "node:crypto"
import type {
  CreateRosterInput,
  Roster,
  RosterCatalog,
  RosterEntry,
  RosterOperationErrorCode,
  RosterResult,
  RosterUnit,
  SelectedUpgrade,
} from "../types/roster.ts"

export type IdGenerator = () => string

const success = <T>(value: T): RosterResult<T> => ({ ok: true, value })

const failure = <T = never>(
  code: RosterOperationErrorCode,
  message: string,
): RosterResult<T> => ({
  ok: false,
  error: { code, message },
})

const getUnit = (
  roster: Roster,
  catalog: RosterCatalog,
  unitId: string,
): RosterResult<RosterUnit> => {
  if (roster.gameId !== catalog.gameId) {
    return failure(
      "invalid-game",
      `Game "${roster.gameId}" does not match the catalog`,
    )
  }
  if (!catalog.factionIds.includes(roster.factionId)) {
    return failure(
      "invalid-faction",
      `Faction "${roster.factionId}" does not exist in Game "${roster.gameId}"`,
    )
  }

  const unit = catalog.units.find((candidate) => candidate.id === unitId)
  if (!unit) {
    return failure("invalid-unit", `Unit "${unitId}" does not exist`)
  }
  if (unit.factionId !== roster.factionId) {
    return failure(
      "unit-not-eligible",
      `Unit "${unitId}" is not available to faction "${roster.factionId}"`,
    )
  }
  return success(unit)
}

const validateQuantity = (
  quantity: number,
  unit: RosterUnit,
): RosterResult<number> => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return failure("invalid-quantity", "Unit quantity must be a positive integer")
  }
  if (quantity < unit.minSize || quantity > unit.maxSize) {
    return failure(
      "unit-size-out-of-range",
      `Unit quantity must be between ${unit.minSize} and ${unit.maxSize}`,
    )
  }
  return success(quantity)
}

const validateSelectedUpgrades = (
  selections: readonly SelectedUpgrade[],
  unit: RosterUnit,
  catalog: RosterCatalog,
): RosterResult<SelectedUpgrade[]> => {
  const availableUpgrades = unit.availableUpgrades ?? []
  const availabilityById = new Map(
    availableUpgrades.map((available) => [available.upgradeId, available]),
  )
  const quantityById = new Map<string, number>()

  for (const selection of selections) {
    if (!catalog.upgradeIds.includes(selection.upgradeId)) {
      return failure(
        "unknown-upgrade",
        `Upgrade "${selection.upgradeId}" does not exist`,
      )
    }

    const availability = availabilityById.get(selection.upgradeId)
    if (!availability) {
      return failure(
        "upgrade-not-available",
        `Upgrade "${selection.upgradeId}" is not available to Unit "${unit.id}"`,
      )
    }

    if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) {
      return failure(
        "invalid-upgrade-quantity",
        `Upgrade "${selection.upgradeId}" quantity must be a positive integer`,
      )
    }

    if (quantityById.has(selection.upgradeId)) {
      return failure(
        "duplicate-upgrade-selection",
        `Upgrade "${selection.upgradeId}" must appear only once`,
      )
    }

    const min = availability.min ?? 0
    const max = availability.max ?? 1
    if (selection.quantity < min || selection.quantity > max) {
      return failure(
        "upgrade-quantity-out-of-range",
        `Upgrade "${selection.upgradeId}" quantity must be between ${min} and ${max}`,
      )
    }

    quantityById.set(selection.upgradeId, selection.quantity)
  }

  for (const available of availableUpgrades) {
    const min = available.min ?? 0
    const selectedQuantity = quantityById.get(available.upgradeId) ?? 0
    if (selectedQuantity < min) {
      return failure(
        "required-upgrade-missing",
        `Upgrade "${available.upgradeId}" requires a quantity of at least ${min}`,
      )
    }
  }

  return success(selections.map((selection) => ({ ...selection })))
}

const getEntry = (
  roster: Roster,
  entryId: string,
): RosterResult<RosterEntry> => {
  if (typeof entryId !== "string" || entryId.trim().length === 0) {
    return failure("invalid-entry-id", "Roster entry ID must be a non-empty string")
  }
  const entry = roster.rosterEntries.find((candidate) => candidate.id === entryId)
  if (!entry) {
    return failure("entry-not-found", `Roster entry "${entryId}" does not exist`)
  }
  return success(entry)
}

export const createRoster = (
  input: CreateRosterInput,
  catalog: RosterCatalog,
  generateId: IdGenerator = randomUUID,
): RosterResult<Roster> => {
  if (typeof input.name !== "string" || input.name.trim().length === 0) {
    return failure("invalid-name", "Roster name must not be empty")
  }
  if (input.gameId !== catalog.gameId) {
    return failure("invalid-game", `Game "${input.gameId}" does not exist`)
  }
  if (!catalog.factionIds.includes(input.factionId)) {
    return failure(
      "invalid-faction",
      `Faction "${input.factionId}" does not exist in Game "${input.gameId}"`,
    )
  }
  if (
    typeof input.pointsLimit !== "number" ||
    !Number.isFinite(input.pointsLimit) ||
    input.pointsLimit <= 0
  ) {
    return failure("invalid-points-limit", "Points limit must be a positive number")
  }

  const id = generateId()
  if (typeof id !== "string" || id.trim().length === 0) {
    return failure("invalid-generated-id", "Roster ID generator returned an empty ID")
  }

  return success({
    id,
    name: input.name.trim(),
    gameId: input.gameId,
    factionId: input.factionId,
    pointsLimit: input.pointsLimit,
    rosterEntries: [],
    supported: true,
  })
}

export const addRosterEntry = (
  roster: Roster,
  catalog: RosterCatalog,
  unitId: string,
  quantity: number,
  selectedUpgrades: readonly SelectedUpgrade[] = [],
  generateId: IdGenerator = randomUUID,
): RosterResult<Roster> => {
  const unitResult = getUnit(roster, catalog, unitId)
  if (!unitResult.ok) {
    return unitResult
  }

  const quantityResult = validateQuantity(quantity, unitResult.value)
  if (!quantityResult.ok) {
    return quantityResult
  }

  const upgradesResult = validateSelectedUpgrades(
    selectedUpgrades,
    unitResult.value,
    catalog,
  )
  if (!upgradesResult.ok) {
    return upgradesResult
  }

  const id = generateId()
  if (typeof id !== "string" || id.trim().length === 0) {
    return failure(
      "invalid-generated-id",
      "Roster entry ID generator returned an empty ID",
    )
  }
  if (roster.rosterEntries.some((entry) => entry.id === id)) {
    return failure("duplicate-generated-id", `Roster entry ID "${id}" already exists`)
  }

  return success({
    ...roster,
    rosterEntries: [
      ...roster.rosterEntries,
      {
        id,
        unitId,
        quantity: quantityResult.value,
        selectedUpgrades: upgradesResult.value,
      },
    ],
  })
}

export const removeRosterEntry = (
  roster: Roster,
  entryId: string,
): RosterResult<Roster> => {
  const entryResult = getEntry(roster, entryId)
  if (!entryResult.ok) {
    return entryResult
  }

  return success({
    ...roster,
    rosterEntries: roster.rosterEntries.filter((entry) => entry.id !== entryId),
  })
}

export const updateRosterEntryQuantity = (
  roster: Roster,
  catalog: RosterCatalog,
  entryId: string,
  quantity: number,
): RosterResult<Roster> => {
  const entryResult = getEntry(roster, entryId)
  if (!entryResult.ok) {
    return entryResult
  }

  const unitResult = getUnit(roster, catalog, entryResult.value.unitId)
  if (!unitResult.ok) {
    return unitResult
  }

  const quantityResult = validateQuantity(quantity, unitResult.value)
  if (!quantityResult.ok) {
    return quantityResult
  }

  return success({
    ...roster,
    rosterEntries: roster.rosterEntries.map((entry) =>
      entry.id === entryId
        ? { ...entry, quantity: quantityResult.value }
        : entry,
    ),
  })
}

export const setRosterEntryUpgrades = (
  roster: Roster,
  catalog: RosterCatalog,
  entryId: string,
  selectedUpgrades: readonly SelectedUpgrade[],
): RosterResult<Roster> => {
  const entryResult = getEntry(roster, entryId)
  if (!entryResult.ok) {
    return entryResult
  }

  const unitResult = getUnit(roster, catalog, entryResult.value.unitId)
  if (!unitResult.ok) {
    return unitResult
  }

  const upgradesResult = validateSelectedUpgrades(
    selectedUpgrades,
    unitResult.value,
    catalog,
  )
  if (!upgradesResult.ok) {
    return upgradesResult
  }

  return success({
    ...roster,
    rosterEntries: roster.rosterEntries.map((entry) =>
      entry.id === entryId
        ? { ...entry, selectedUpgrades: upgradesResult.value }
        : entry,
    ),
  })
}
