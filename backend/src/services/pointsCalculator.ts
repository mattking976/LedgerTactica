import type { Roster, RosterEntry } from "../types/roster.ts"
import type {
  PointsCalculationErrorCode,
  PointsCalculationResult,
  PointsCatalog,
  PointsUnitDefinition,
} from "../types/points.ts"

interface SizeTier {
  minSize: number
  maxSize: number
  cost: number
}

const success = <T>(value: T): PointsCalculationResult<T> => ({
  ok: true,
  value,
})

const failure = <T = never>(
  code: PointsCalculationErrorCode,
  message: string,
): PointsCalculationResult<T> => ({
  ok: false,
  error: { code, message },
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0

const findUnit = (
  entry: RosterEntry,
  catalog: PointsCatalog,
): PointsCalculationResult<PointsUnitDefinition> => {
  const units = catalog.units.filter((unit) => unit.id === entry.unitId)
  if (units.length === 0) {
    return failure("unit-not-found", `Unit "${entry.unitId}" does not exist`)
  }
  if (units.length > 1) {
    return failure(
      "duplicate-unit-definition",
      `Unit "${entry.unitId}" has multiple definitions`,
    )
  }
  return success(units[0])
}

const calculateUnitCost = (
  unit: PointsUnitDefinition,
  quantity: number,
): PointsCalculationResult<number> => {
  if (!isNonNegativeNumber(unit.baseCost)) {
    return failure(
      "invalid-unit-cost",
      `Unit "${unit.id}" must have a non-negative base cost`,
    )
  }
  if (
    !isPositiveInteger(unit.minSize) ||
    !isPositiveInteger(unit.maxSize) ||
    unit.maxSize < unit.minSize
  ) {
    return failure(
      "invalid-unit-size",
      `Unit "${unit.id}" must have a valid minimum and maximum size`,
    )
  }
  if (quantity < unit.minSize || quantity > unit.maxSize) {
    return failure(
      "invalid-entry",
      `Unit "${unit.id}" quantity must be between ${unit.minSize} and ${unit.maxSize}`,
    )
  }

  const costModel = unit.costModel ?? { type: "fixed" }
  if (!isRecord(costModel) || typeof costModel.type !== "string") {
    return failure(
      "invalid-unit-cost-model",
      `Unit "${unit.id}" has an invalid cost model`,
    )
  }

  if (costModel.type === "fixed") {
    return success(unit.baseCost)
  }

  if (costModel.type === "per-model") {
    if (!isNonNegativeNumber(costModel.additionalModelCost)) {
      return failure(
        "invalid-unit-cost-model",
        `Unit "${unit.id}" additional model cost must be non-negative`,
      )
    }
    return success(
      unit.baseCost + (quantity - unit.minSize) * costModel.additionalModelCost,
    )
  }

  if (costModel.type === "size-tier") {
    if (!Array.isArray(costModel.tiers) || costModel.tiers.length === 0) {
      return failure(
        "invalid-unit-cost-model",
        `Unit "${unit.id}" must define at least one size tier`,
      )
    }

    const tiers: SizeTier[] = []
    for (const tier of costModel.tiers) {
      if (
        !isRecord(tier) ||
        !isPositiveInteger(tier.minSize) ||
        !isPositiveInteger(tier.maxSize) ||
        tier.maxSize < tier.minSize ||
        !isNonNegativeNumber(tier.cost)
      ) {
        return failure(
          "invalid-unit-cost-model",
          `Unit "${unit.id}" contains an invalid size tier`,
        )
      }
      tiers.push({
        minSize: tier.minSize,
        maxSize: tier.maxSize,
        cost: tier.cost,
      })
    }

    const matchingTiers = tiers.filter(
      (tier) => quantity >= tier.minSize && quantity <= tier.maxSize,
    )
    if (matchingTiers.length !== 1) {
      return failure(
        "invalid-unit-cost-model",
        `Unit "${unit.id}" must have exactly one cost tier for size ${quantity}`,
      )
    }
    return success(matchingTiers[0].cost)
  }

  return failure(
    "invalid-unit-cost-model",
    `Unit "${unit.id}" uses unsupported cost model "${costModel.type}"`,
  )
}

const calculateUpgradeCost = (
  entry: RosterEntry,
  unit: PointsUnitDefinition,
  catalog: PointsCatalog,
): PointsCalculationResult<number> => {
  const availableUpgrades = unit.availableUpgrades ?? []
  const availabilityById = new Map(
    availableUpgrades.map((available) => [available.upgradeId, available]),
  )
  if (availabilityById.size !== availableUpgrades.length) {
    return failure(
      "invalid-unit-upgrades",
      `Unit "${unit.id}" declares duplicate available Upgrade IDs`,
    )
  }

  const selectionById = new Map<string, number>()
  let total = 0

  for (const selection of entry.selectedUpgrades) {
    if (
      typeof selection.upgradeId !== "string" ||
      selection.upgradeId.trim().length === 0 ||
      !isPositiveInteger(selection.quantity) ||
      selectionById.has(selection.upgradeId)
    ) {
      return failure(
        "invalid-upgrade-selection",
        `Roster entry "${entry.id}" has an invalid or duplicate Upgrade selection`,
      )
    }

    const availability = availabilityById.get(selection.upgradeId)
    if (!availability) {
      return failure(
        "invalid-upgrade-selection",
        `Upgrade "${selection.upgradeId}" is not available to Unit "${unit.id}"`,
      )
    }

    const min = availability.min ?? 0
    const max = availability.max ?? 1
    if (
      !Number.isInteger(min) ||
      min < 0 ||
      !Number.isInteger(max) ||
      max < min ||
      selection.quantity < min ||
      selection.quantity > max
    ) {
      return failure(
        "invalid-upgrade-selection",
        `Upgrade "${selection.upgradeId}" quantity must be between ${min} and ${max}`,
      )
    }

    const upgrades = catalog.upgrades.filter(
      (upgrade) => upgrade.id === selection.upgradeId,
    )
    if (upgrades.length === 0) {
      return failure(
        "upgrade-not-found",
        `Upgrade "${selection.upgradeId}" does not exist`,
      )
    }
    if (upgrades.length > 1) {
      return failure(
        "duplicate-upgrade-definition",
        `Upgrade "${selection.upgradeId}" has multiple definitions`,
      )
    }

    const upgrade = upgrades[0]
    if (!isNonNegativeNumber(upgrade.cost)) {
      return failure(
        "invalid-upgrade-cost",
        `Upgrade "${upgrade.id}" must have a non-negative cost`,
      )
    }

    const costModel = upgrade.costModel ?? "flat"
    if (costModel !== "flat" && costModel !== "per-model") {
      return failure(
        "invalid-upgrade-cost-model",
        `Upgrade "${upgrade.id}" uses unsupported cost model "${String(costModel)}"`,
      )
    }

    const multiplier =
      costModel === "per-model" ? entry.quantity * selection.quantity : selection.quantity
    total += upgrade.cost * multiplier
    selectionById.set(selection.upgradeId, selection.quantity)
  }

  for (const available of availableUpgrades) {
    const min = available.min ?? 0
    if (!Number.isInteger(min) || min < 0) {
      return failure(
        "invalid-unit-upgrades",
        `Unit "${unit.id}" has an invalid minimum for Upgrade "${available.upgradeId}"`,
      )
    }
    if ((selectionById.get(available.upgradeId) ?? 0) < min) {
      return failure(
        "invalid-upgrade-selection",
        `Roster entry "${entry.id}" is missing required Upgrade "${available.upgradeId}"`,
      )
    }
  }

  if (!Number.isFinite(total)) {
    return failure(
      "total-overflow",
      `Upgrade costs for roster entry "${entry.id}" exceed the supported numeric range`,
    )
  }
  return success(total)
}

export const calculateEntryCost = (
  entry: RosterEntry,
  catalog: PointsCatalog,
): PointsCalculationResult<number> => {
  if (
    typeof entry.id !== "string" ||
    entry.id.trim().length === 0 ||
    typeof entry.unitId !== "string" ||
    entry.unitId.trim().length === 0 ||
    !isPositiveInteger(entry.quantity) ||
    !Array.isArray(entry.selectedUpgrades)
  ) {
    return failure("invalid-entry", "Roster entry has invalid required fields")
  }

  const unitResult = findUnit(entry, catalog)
  if (!unitResult.ok) {
    return unitResult
  }

  const unitCostResult = calculateUnitCost(unitResult.value, entry.quantity)
  if (!unitCostResult.ok) {
    return unitCostResult
  }

  const upgradeCostResult = calculateUpgradeCost(
    entry,
    unitResult.value,
    catalog,
  )
  if (!upgradeCostResult.ok) {
    return upgradeCostResult
  }

  const total = unitCostResult.value + upgradeCostResult.value
  if (!Number.isFinite(total)) {
    return failure(
      "total-overflow",
      `Total cost for roster entry "${entry.id}" exceeds the supported numeric range`,
    )
  }
  return success(total)
}

export const calculateRosterTotal = (
  roster: Roster,
  catalog: PointsCatalog,
): PointsCalculationResult<number> => {
  if (!Array.isArray(roster.rosterEntries)) {
    return failure("invalid-entry", "Roster entries must be an array")
  }

  let total = 0
  for (const entry of roster.rosterEntries) {
    const entryResult = calculateEntryCost(entry, catalog)
    if (!entryResult.ok) {
      return entryResult
    }
    total += entryResult.value
    if (!Number.isFinite(total)) {
      return failure(
        "total-overflow",
        `Roster "${roster.id}" total exceeds the supported numeric range`,
      )
    }
  }

  return success(total)
}
