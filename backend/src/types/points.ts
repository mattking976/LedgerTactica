import type { AvailableUpgrade } from "./roster.ts"

export interface PointsUnitDefinition {
  id: string
  baseCost: number
  minSize: number
  maxSize: number
  costModel?: unknown
  availableUpgrades?: readonly AvailableUpgrade[]
}

export interface PointsUpgradeDefinition {
  id: string
  cost: number
  costModel?: unknown
}

export interface PointsCatalog {
  units: readonly PointsUnitDefinition[]
  upgrades: readonly PointsUpgradeDefinition[]
}

export type PointsCalculationErrorCode =
  | "invalid-entry"
  | "unit-not-found"
  | "duplicate-unit-definition"
  | "invalid-unit-cost"
  | "invalid-unit-size"
  | "invalid-unit-cost-model"
  | "invalid-unit-upgrades"
  | "invalid-upgrade-selection"
  | "upgrade-not-found"
  | "duplicate-upgrade-definition"
  | "invalid-upgrade-cost"
  | "invalid-upgrade-cost-model"
  | "total-overflow"

export interface PointsCalculationError {
  code: PointsCalculationErrorCode
  message: string
}

export type PointsCalculationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PointsCalculationError }
