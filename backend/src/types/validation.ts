import type {
  PointsCalculationResult,
  PointsUnitDefinition,
  PointsUpgradeDefinition,
} from "./points.ts"

export interface ValidationFaction {
  id: string
  gameId: string
  name: string
  tags?: readonly string[]
  supported: boolean
}

export interface ValidationUnit extends PointsUnitDefinition {
  factionId: string
  name: string
  tags: readonly string[]
  supported: boolean
}

export interface ValidationUpgrade extends PointsUpgradeDefinition {
  name: string
  tags?: readonly string[]
  supported: boolean
}

export interface ValidationRuleDefinition extends Record<string, unknown> {
  id: string
  type: string
}

export interface ValidationCatalog {
  gameId: string
  factions: readonly ValidationFaction[]
  units: readonly ValidationUnit[]
  upgrades: readonly ValidationUpgrade[]
  rules: readonly ValidationRuleDefinition[]
}

export type RosterValidationErrorCode =
  | "invalid-roster"
  | "invalid-catalog"
  | "game-mismatch"
  | "faction-not-found"
  | "faction-not-eligible"
  | "unit-not-found"
  | "unit-not-eligible"
  | "upgrade-not-found"
  | "upgrade-not-available"
  | "invalid-upgrade-selection"
  | "points-calculation-failed"
  | "invalid-rule"

export interface RosterValidationError {
  code: RosterValidationErrorCode
  message: string
}

export interface RuleValidationResult {
  ruleId: string
  valid: boolean
  message: string
  code?: "unsupported-rule"
}

export interface RosterValidationReport {
  valid: boolean
  results: RuleValidationResult[]
}

export type RosterValidationResult =
  | { ok: true; value: RosterValidationReport }
  | { ok: false; error: RosterValidationError }

export type PointsTotal = PointsCalculationResult<number>
