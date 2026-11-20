import {
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import type { Roster, RosterEntry, SelectedUpgrade } from "../types/roster.ts"

export type RosterStorageErrorCode =
  | "invalid-roster-id"
  | "invalid-roster"
  | "not-found"
  | "already-exists"
  | "malformed-storage"
  | "storage-failure"

export class RosterStorageError extends Error {
  readonly code: RosterStorageErrorCode
  readonly details: string[]

  constructor(
    code: RosterStorageErrorCode,
    message: string,
    details: string[] = [],
  ) {
    super(message)
    this.name = "RosterStorageError"
    this.code = code
    this.details = details
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0

const hasOnlyKeys = (
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean => Object.keys(value).every((key) => allowedKeys.includes(key))

const isRosterId = (value: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)

const getErrorCode = (error: unknown): string | undefined =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string"
    ? error.code
    : undefined

const storageFailure = (
  action: string,
  error: unknown,
): RosterStorageError => {
  const code = getErrorCode(error)
  return new RosterStorageError(
    "storage-failure",
    `Unable to ${action}${code ? ` (${code})` : ""}`,
    [error instanceof Error ? error.message : String(error)],
  )
}

const invalidRoster = (message: string): RosterStorageError =>
  new RosterStorageError("invalid-roster", message)

const normalizeSelectedUpgrades = (
  value: unknown,
  entryId: string,
): SelectedUpgrade[] => {
  if (!Array.isArray(value)) {
    throw invalidRoster(`Roster entry "${entryId}" selectedUpgrades must be an array`)
  }

  const ids = new Set<string>()
  return value.map((selection, index) => {
    if (
      !isRecord(selection) ||
      !hasOnlyKeys(selection, ["upgradeId", "quantity"]) ||
      !isNonEmptyString(selection.upgradeId) ||
      !isPositiveInteger(selection.quantity)
    ) {
      throw invalidRoster(
        `Roster entry "${entryId}" has an invalid Upgrade selection at index ${index}`,
      )
    }
    if (ids.has(selection.upgradeId)) {
      throw invalidRoster(
        `Roster entry "${entryId}" contains duplicate Upgrade "${selection.upgradeId}"`,
      )
    }
    ids.add(selection.upgradeId)
    return {
      upgradeId: selection.upgradeId,
      quantity: selection.quantity,
    }
  })
}

const normalizeRosterEntries = (value: unknown): RosterEntry[] => {
  if (!Array.isArray(value)) {
    throw invalidRoster("Roster rosterEntries must be an array")
  }

  const ids = new Set<string>()
  return value.map((entry, index) => {
    if (
      !isRecord(entry) ||
      !hasOnlyKeys(entry, ["id", "unitId", "quantity", "selectedUpgrades"]) ||
      !isNonEmptyString(entry.id) ||
      !isNonEmptyString(entry.unitId) ||
      !isPositiveInteger(entry.quantity)
    ) {
      throw invalidRoster(`Roster entry at index ${index} has invalid required fields`)
    }
    if (ids.has(entry.id)) {
      throw invalidRoster(`Roster contains duplicate entry ID "${entry.id}"`)
    }
    ids.add(entry.id)

    return {
      id: entry.id,
      unitId: entry.unitId,
      quantity: entry.quantity,
      selectedUpgrades:
        entry.selectedUpgrades === undefined
          ? []
          : normalizeSelectedUpgrades(entry.selectedUpgrades, entry.id),
    }
  })
}

const normalizeRoster = (value: unknown): Roster => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "id",
      "name",
      "gameId",
      "factionId",
      "pointsLimit",
      "rosterEntries",
      "supported",
    ]) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.gameId) ||
    !isNonEmptyString(value.factionId) ||
    typeof value.pointsLimit !== "number" ||
    !Number.isFinite(value.pointsLimit) ||
    value.pointsLimit <= 0 ||
    typeof value.supported !== "boolean"
  ) {
    throw invalidRoster("Roster has invalid required fields")
  }
  if (!isRosterId(value.id)) {
    throw new RosterStorageError(
      "invalid-roster-id",
      "Roster ID may contain only letters, numbers, underscores, and hyphens",
    )
  }

  return {
    id: value.id,
    name: value.name.trim(),
    gameId: value.gameId,
    factionId: value.factionId,
    pointsLimit: value.pointsLimit,
    rosterEntries: normalizeRosterEntries(value.rosterEntries),
    supported: value.supported,
  }
}

export const validateRosterData = (value: unknown): Roster =>
  normalizeRoster(value)

export class RosterStorage {
  private readonly directory: string

  constructor(directory: string) {
    this.directory = directory
  }

  async list(): Promise<Roster[]> {
    let entries
    try {
      entries = await readdir(this.directory, { withFileTypes: true })
    } catch (error) {
      if (getErrorCode(error) === "ENOENT") {
        return []
      }
      throw storageFailure("list rosters", error)
    }

    const rosterFiles = entries
      .filter((entry) => path.extname(entry.name) === ".json")
      .sort((left, right) => left.name.localeCompare(right.name))
    const rosters: Roster[] = []
    for (const entry of rosterFiles) {
      const rosterId = path.basename(entry.name, ".json")
      if (!entry.isFile() || !isRosterId(rosterId)) {
        throw new RosterStorageError(
          "malformed-storage",
          `Roster storage entry "${entry.name}" is not a valid roster file`,
        )
      }
      const roster = await this.readFile(rosterId)
      rosters.push(roster)
    }
    return rosters
  }

  async get(rosterId: string): Promise<Roster> {
    const filePath = this.getFilePath(rosterId)
    let contents: string
    try {
      contents = await readFile(filePath, "utf8")
    } catch (error) {
      if (getErrorCode(error) === "ENOENT") {
        throw new RosterStorageError(
          "not-found",
          `Roster "${rosterId}" does not exist`,
        )
      }
      throw storageFailure(`read roster "${rosterId}"`, error)
    }
    return this.parseRoster(contents, rosterId)
  }

  async create(value: unknown): Promise<Roster> {
    const roster = validateRosterData(value)
    await this.ensureDirectory()
    const filePath = this.getFilePath(roster.id)
    try {
      await writeFile(filePath, this.serialize(roster), {
        encoding: "utf8",
        flag: "wx",
      })
    } catch (error) {
      if (getErrorCode(error) === "EEXIST") {
        throw new RosterStorageError(
          "already-exists",
          `Roster "${roster.id}" already exists`,
        )
      }
      throw storageFailure(`save roster "${roster.id}"`, error)
    }
    return roster
  }

  async update(rosterId: string, value: unknown): Promise<Roster> {
    const roster = validateRosterData(value)
    if (roster.id !== rosterId) {
      throw invalidRoster(
        `Roster body ID "${roster.id}" does not match URL ID "${rosterId}"`,
      )
    }
    const filePath = this.getFilePath(rosterId)
    try {
      const existing = await stat(filePath)
      if (!existing.isFile()) {
        throw new RosterStorageError(
          "storage-failure",
          `Roster path "${rosterId}" is not a file`,
        )
      }
    } catch (error) {
      if (getErrorCode(error) === "ENOENT") {
        throw new RosterStorageError(
          "not-found",
          `Roster "${rosterId}" does not exist`,
        )
      }
      if (error instanceof RosterStorageError) {
        throw error
      }
      throw storageFailure(`check roster "${rosterId}"`, error)
    }

    try {
      await writeFile(filePath, this.serialize(roster), "utf8")
    } catch (error) {
      throw storageFailure(`update roster "${rosterId}"`, error)
    }
    return roster
  }

  async delete(rosterId: string): Promise<void> {
    const filePath = this.getFilePath(rosterId)
    try {
      await unlink(filePath)
    } catch (error) {
      if (getErrorCode(error) === "ENOENT") {
        throw new RosterStorageError(
          "not-found",
          `Roster "${rosterId}" does not exist`,
        )
      }
      throw storageFailure(`delete roster "${rosterId}"`, error)
    }
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await mkdir(this.directory, { recursive: true })
    } catch (error) {
      throw storageFailure("create roster storage directory", error)
    }
  }

  private getFilePath(rosterId: string): string {
    if (!isRosterId(rosterId)) {
      throw new RosterStorageError(
        "invalid-roster-id",
        "Roster ID may contain only letters, numbers, underscores, and hyphens",
      )
    }
    return path.join(this.directory, `${rosterId}.json`)
  }

  private async readFile(rosterId: string): Promise<Roster> {
    const filePath = this.getFilePath(rosterId)
    let contents: string
    try {
      contents = await readFile(filePath, "utf8")
    } catch (error) {
      throw storageFailure(`read roster "${rosterId}"`, error)
    }
    return this.parseRoster(contents, rosterId)
  }

  private parseRoster(contents: string, expectedId: string): Roster {
    let parsed: unknown
    try {
      parsed = JSON.parse(contents)
    } catch (error) {
      throw new RosterStorageError(
        "malformed-storage",
        `Roster "${expectedId}" contains invalid JSON`,
        [error instanceof Error ? error.message : String(error)],
      )
    }

    try {
      const roster = normalizeRoster(parsed)
      if (roster.id !== expectedId) {
        throw invalidRoster(
          `Stored roster ID "${roster.id}" does not match filename "${expectedId}"`,
        )
      }
      return roster
    } catch (error) {
      if (error instanceof RosterStorageError) {
        throw new RosterStorageError(
          "malformed-storage",
          `Roster "${expectedId}" contains invalid data`,
          [error.message],
        )
      }
      throw storageFailure(`validate stored roster "${expectedId}"`, error)
    }
  }

  private serialize(roster: Roster): string {
    return `${JSON.stringify(roster, null, 2)}\n`
  }
}
