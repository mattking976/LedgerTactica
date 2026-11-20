export interface SelectedUpgrade {
  upgradeId: string
  quantity: number
}

export interface RosterEntry {
  id: string
  unitId: string
  quantity: number
  selectedUpgrades: SelectedUpgrade[]
}

export interface Roster {
  id: string
  name: string
  gameId: string
  factionId: string
  pointsLimit: number
  rosterEntries: RosterEntry[]
  supported: boolean
}

export interface AvailableUpgrade {
  upgradeId: string
  min?: number
  max?: number
}

export interface RosterUnit {
  id: string
  factionId: string
  minSize: number
  maxSize: number
  availableUpgrades?: readonly AvailableUpgrade[]
}

export interface RosterCatalog {
  gameId: string
  factionIds: readonly string[]
  units: readonly RosterUnit[]
  upgradeIds: readonly string[]
}

export interface CreateRosterInput {
  name: string
  gameId: string
  factionId: string
  pointsLimit: number
}

export type RosterOperationErrorCode =
  | "invalid-name"
  | "invalid-game"
  | "invalid-faction"
  | "invalid-points-limit"
  | "invalid-unit"
  | "unit-not-eligible"
  | "invalid-entry-id"
  | "entry-not-found"
  | "invalid-quantity"
  | "unit-size-out-of-range"
  | "unknown-upgrade"
  | "upgrade-not-available"
  | "invalid-upgrade-quantity"
  | "upgrade-quantity-out-of-range"
  | "duplicate-upgrade-selection"
  | "required-upgrade-missing"
  | "invalid-generated-id"
  | "duplicate-generated-id"

export interface RosterOperationError {
  code: RosterOperationErrorCode
  message: string
}

export type RosterResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RosterOperationError }
