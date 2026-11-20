import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import type { Dirent } from "node:fs"
import {
  GamePackageError,
  type GameDefinition,
  type GamePackage,
  type JsonObject,
} from "../types/gamePackage.ts"

const collectionNames = ["factions", "units", "upgrades", "rules"] as const
type CollectionName = (typeof collectionNames)[number]

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean"

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isNonEmptyString)

const isSupported = (value: JsonObject): boolean =>
  isBoolean(value.supported)

const getErrorCode = (error: unknown): string | undefined =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string"
    ? error.code
    : undefined

const addError = (errors: string[], location: string, message: string) => {
  errors.push(`${location}: ${message}`)
}

const requiredStringFields = (
  value: JsonObject,
  fields: string[],
  location: string,
  errors: string[],
) => {
  for (const field of fields) {
    if (!isNonEmptyString(value[field])) {
      addError(errors, location, `"${field}" must be a non-empty string`)
    }
  }
}

const readJsonFile = async (
  filePath: string,
  location: string,
  errors: string[],
): Promise<JsonObject | undefined> => {
  let contents: string

  try {
    contents = await readFile(filePath, "utf8")
  } catch (error) {
    const code = getErrorCode(error)
    addError(
      errors,
      location,
      `could not be read${code ? ` (${code})` : ""}`,
    )
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(contents)
    if (!isRecord(parsed)) {
      addError(errors, location, "must contain a JSON object")
      return undefined
    }
    return parsed
  } catch (error) {
    addError(
      errors,
      location,
      `contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
    return undefined
  }
}

const readCollection = async (
  packagePath: string,
  collection: CollectionName,
  errors: string[],
): Promise<{
  definitions: JsonObject[]
  ids: Set<string>
  locations: Map<JsonObject, string>
}> => {
  const directory = path.join(packagePath, collection)
  let entries: Dirent[]

  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    const code = getErrorCode(error)
    addError(
      errors,
      collection,
      `directory is missing or could not be read${code ? ` (${code})` : ""}`,
    )
    return { definitions: [], ids: new Set(), locations: new Map() }
  }

  const definitions: JsonObject[] = []
  const ids = new Set<string>()
  const locations = new Map<JsonObject, string>()

  for (const entry of entries) {
    if (entry.name === ".gitkeep") {
      continue
    }

    const location = `${collection}/${entry.name}`
    if (!entry.isFile() || path.extname(entry.name) !== ".json") {
      addError(errors, location, "must be a JSON file")
      continue
    }

    const definition = await readJsonFile(
      path.join(directory, entry.name),
      location,
      errors,
    )
    if (!definition) {
      continue
    }

    if (!isNonEmptyString(definition.id)) {
      addError(errors, location, '"id" must be a non-empty string')
    } else {
      if (path.basename(entry.name, ".json") !== definition.id) {
        addError(errors, location, "filename must match the definition id")
      }
      if (ids.has(definition.id)) {
        addError(errors, location, `duplicate id "${definition.id}"`)
      } else {
        ids.add(definition.id)
      }
    }

    definitions.push(definition)
    locations.set(definition, location)
  }

  return { definitions, ids, locations }
}

const validateGame = (
  game: JsonObject,
  location: string,
  errors: string[],
) => {
  requiredStringFields(
    game,
    ["id", "name", "version", "releaseDate", "status"],
    location,
    errors,
  )

  if (!isSupported(game)) {
    addError(errors, location, '"supported" must be a boolean')
  }

  if (
    isNonEmptyString(game.status) &&
    !["active", "legacy", "archived"].includes(game.status)
  ) {
    addError(errors, location, '"status" must be active, legacy, or archived')
  }

  if (
    isNonEmptyString(game.releaseDate) &&
    !/^\d{4}-\d{2}-\d{2}$/.test(game.releaseDate)
  ) {
    addError(errors, location, '"releaseDate" must be a valid ISO date')
  } else if (isNonEmptyString(game.releaseDate)) {
    const date = new Date(`${game.releaseDate}T00:00:00.000Z`)
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== game.releaseDate
    ) {
      addError(errors, location, '"releaseDate" must be a valid ISO date')
    }
  }
}

const validateFaction = (
  faction: JsonObject,
  gameId: string,
  location: string,
  errors: string[],
) => {
  requiredStringFields(faction, ["id", "gameId", "name"], location, errors)
  if (!isSupported(faction)) {
    addError(errors, location, '"supported" must be a boolean')
  }
  if (faction.gameId !== gameId) {
    addError(errors, location, `"gameId" must reference "${gameId}"`)
  }
  if (faction.tags !== undefined && !isStringArray(faction.tags)) {
    addError(errors, location, '"tags" must be an array of non-empty strings')
  }
}

const validateUnit = (
  unit: JsonObject,
  factionIds: Set<string>,
  upgradeIds: Set<string>,
  location: string,
  errors: string[],
) => {
  requiredStringFields(
    unit,
    ["id", "factionId", "name"],
    location,
    errors,
  )
  if (!isNonNegativeNumber(unit.baseCost)) {
    addError(errors, location, '"baseCost" must be a non-negative number')
  }
  if (!isPositiveInteger(unit.minSize)) {
    addError(errors, location, '"minSize" must be a positive integer')
  }
  if (!isPositiveInteger(unit.maxSize)) {
    addError(errors, location, '"maxSize" must be a positive integer')
  } else if (
    isPositiveInteger(unit.minSize) &&
    unit.maxSize < unit.minSize
  ) {
    addError(errors, location, '"maxSize" must be at least "minSize"')
  }
  if (!isStringArray(unit.tags) || unit.tags.length === 0) {
    addError(errors, location, '"tags" must contain at least one non-empty string')
  }
  if (!isSupported(unit)) {
    addError(errors, location, '"supported" must be a boolean')
  }
  if (
    isNonEmptyString(unit.factionId) &&
    !factionIds.has(unit.factionId)
  ) {
    addError(errors, location, `"factionId" references missing faction "${unit.factionId}"`)
  }

  if (unit.costModel !== undefined) {
    validateCostModel(
      unit.costModel,
      unit.minSize,
      unit.maxSize,
      location,
      errors,
    )
  }

  if (unit.availableUpgrades !== undefined) {
    if (!Array.isArray(unit.availableUpgrades)) {
      addError(errors, location, '"availableUpgrades" must be an array')
    } else {
      for (const availableUpgrade of unit.availableUpgrades) {
        if (!isRecord(availableUpgrade)) {
          addError(errors, location, "each available upgrade must be an object")
          continue
        }

        const upgradeId = availableUpgrade.upgradeId
        if (!isNonEmptyString(upgradeId) || !upgradeIds.has(upgradeId)) {
          addError(
            errors,
            location,
            `"availableUpgrades" references missing upgrade "${String(upgradeId)}"`,
          )
        }

        const min = availableUpgrade.min ?? 0
        const max = availableUpgrade.max ?? 1
        if (typeof min !== "number" || !Number.isInteger(min) || min < 0) {
          addError(errors, location, "available upgrade min must be a non-negative integer")
        }
        if (
          typeof max !== "number" ||
          !Number.isInteger(max) ||
          max < 0 ||
          (typeof min === "number" && Number.isInteger(min) && max < min)
        ) {
          addError(errors, location, "available upgrade max must be an integer at least min")
        }
      }
    }
  }
}

const validateCostModel = (
  costModel: unknown,
  minSize: unknown,
  maxSize: unknown,
  location: string,
  errors: string[],
) => {
  if (!isRecord(costModel) || !isNonEmptyString(costModel.type)) {
    addError(errors, location, '"costModel" must be an object with a type')
    return
  }

  if (costModel.type === "fixed") {
    return
  }

  if (costModel.type === "per-model") {
    if (!isNonNegativeNumber(costModel.additionalModelCost)) {
      addError(
        errors,
        location,
        '"costModel.additionalModelCost" must be a non-negative number',
      )
    }
    return
  }

  if (costModel.type === "size-tier") {
    if (!Array.isArray(costModel.tiers) || costModel.tiers.length === 0) {
      addError(errors, location, '"costModel.tiers" must be a non-empty array')
      return
    }

    const tiers = costModel.tiers.filter(isRecord)
    if (tiers.length !== costModel.tiers.length) {
      addError(errors, location, "each cost tier must be an object")
    }

    const sortedTiers = [...tiers].sort(
      (left, right) =>
        (typeof left.minSize === "number" ? left.minSize : 0) -
        (typeof right.minSize === "number" ? right.minSize : 0),
    )
    let expectedMin = minSize
    for (const tier of sortedTiers) {
      if (
        !isPositiveInteger(tier.minSize) ||
        !isPositiveInteger(tier.maxSize) ||
        !isNonNegativeNumber(tier.cost)
      ) {
        addError(errors, location, "cost tiers require positive integer bounds and a non-negative cost")
        continue
      }
      if (
        (typeof minSize === "number" && tier.minSize < minSize) ||
        (typeof maxSize === "number" && tier.maxSize > maxSize)
      ) {
        addError(errors, location, "cost tier bounds must be within minSize and maxSize")
      }
      if (tier.maxSize < tier.minSize) {
        addError(errors, location, "cost tier maxSize must be at least minSize")
      }
      if (tier.minSize !== expectedMin) {
        addError(errors, location, "cost tiers must cover every permitted size without gaps or overlaps")
      }
      expectedMin = tier.maxSize + 1
    }
    if (typeof maxSize === "number" && expectedMin !== maxSize + 1) {
      addError(errors, location, "cost tiers must cover every permitted size without gaps or overlaps")
    }
    return
  }

  addError(errors, location, `unsupported cost model type "${costModel.type}"`)
}

const validateUpgrade = (
  upgrade: JsonObject,
  location: string,
  errors: string[],
) => {
  requiredStringFields(upgrade, ["id", "name", "category"], location, errors)
  if (!isNonNegativeNumber(upgrade.cost)) {
    addError(errors, location, '"cost" must be a non-negative number')
  }
  if (
    upgrade.costModel !== undefined &&
    !["flat", "per-model"].includes(String(upgrade.costModel))
  ) {
    addError(errors, location, '"costModel" must be flat or per-model')
  }
  if (!isSupported(upgrade)) {
    addError(errors, location, '"supported" must be a boolean')
  }
  if (upgrade.tags !== undefined && !isStringArray(upgrade.tags)) {
    addError(errors, location, '"tags" must be an array of non-empty strings')
  }
}

const validateRule = (
  rule: JsonObject,
  unitIds: Set<string>,
  upgradeIds: Set<string>,
  location: string,
  errors: string[],
) => {
  requiredStringFields(rule, ["id", "type"], location, errors)
  if (
    isNonEmptyString(rule.unitId) &&
    !unitIds.has(rule.unitId)
  ) {
    addError(errors, location, `"unitId" references missing unit "${rule.unitId}"`)
  }
  if (
    isNonEmptyString(rule.upgradeId) &&
    !upgradeIds.has(rule.upgradeId)
  ) {
    addError(errors, location, `"upgradeId" references missing upgrade "${rule.upgradeId}"`)
  }
}

const hasPackageContent = async (directory: string): Promise<boolean> => {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === ".gitkeep") {
      continue
    }
    if (entry.isFile()) {
      return true
    }
    if (entry.isDirectory() && await hasPackageContent(path.join(directory, entry.name))) {
      return true
    }
  }
  return false
}

export class GamePackageLoader {
  private readonly dataDirectory: string

  constructor(dataDirectory: string) {
    this.dataDirectory = dataDirectory
  }

  async listGames(): Promise<GameDefinition[]> {
    const packages = await this.loadAllPackages()
    return packages.map(({ game }) => game)
  }

  async getGame(gameId: string): Promise<GamePackage | undefined> {
    const packages = await this.loadAllPackages()
    return packages.find(({ game }) => game.id === gameId)
  }

  private async loadAllPackages(): Promise<GamePackage[]> {
    let packageDirectories: Dirent[]
    try {
      packageDirectories = await readdir(this.dataDirectory, { withFileTypes: true })
    } catch (error) {
      throw new GamePackageError("Unable to read game data directory", [
        getErrorCode(error) ?? "directory cannot be read",
      ])
    }

    const packages: GamePackage[] = []
    const gameIds = new Set<string>()
    const errors: string[] = []

    for (const entry of packageDirectories) {
      if (!entry.isDirectory()) {
        if (entry.name !== ".gitkeep") {
          addError(errors, entry.name, "game data root entries must be package directories")
        }
        continue
      }

      const packagePath = path.join(this.dataDirectory, entry.name)
      const gameFile = path.join(packagePath, "game.json")
      let gameFileExists = false
      try {
        await readFile(gameFile)
        gameFileExists = true
      } catch (error) {
        if (getErrorCode(error) !== "ENOENT") {
          addError(errors, `${entry.name}/game.json`, "could not be read")
          continue
        }
      }

      if (!gameFileExists) {
        if (await hasPackageContent(packagePath)) {
          addError(errors, entry.name, 'package contains data but is missing "game.json"')
        }
        continue
      }

      const packageErrors: string[] = []
      const game = await readJsonFile(gameFile, `${entry.name}/game.json`, packageErrors)
      if (!game) {
        errors.push(...packageErrors)
        continue
      }

      validateGame(game, `${entry.name}/game.json`, packageErrors)

      const factionCollection = await readCollection(
        packagePath,
        "factions",
        packageErrors,
      )
      const unitCollection = await readCollection(
        packagePath,
        "units",
        packageErrors,
      )
      const upgradeCollection = await readCollection(
        packagePath,
        "upgrades",
        packageErrors,
      )
      const ruleCollection = await readCollection(
        packagePath,
        "rules",
        packageErrors,
      )
      const { definitions: factions, ids: factionIds } = factionCollection
      const { definitions: units, ids: unitIds } = unitCollection
      const { definitions: upgrades, ids: upgradeIds } = upgradeCollection
      const { definitions: rules } = ruleCollection

      if (isNonEmptyString(game.id)) {
        if (game.id !== entry.name) {
          addError(
            packageErrors,
            `${entry.name}/game.json`,
            `"id" must match the package directory "${entry.name}"`,
          )
        }
        if (gameIds.has(game.id)) {
          addError(packageErrors, `${entry.name}/game.json`, `duplicate game id "${game.id}"`)
        }
        gameIds.add(game.id)
      }

      for (const faction of factions) {
        validateFaction(
          faction,
          String(game.id),
          factionCollection.locations.get(faction) ?? "factions",
          packageErrors,
        )
      }
      for (const upgrade of upgrades) {
        validateUpgrade(
          upgrade,
          upgradeCollection.locations.get(upgrade) ?? "upgrades",
          packageErrors,
        )
      }
      for (const unit of units) {
        validateUnit(
          unit,
          factionIds,
          upgradeIds,
          unitCollection.locations.get(unit) ?? "units",
          packageErrors,
        )
      }
      for (const rule of rules) {
        validateRule(
          rule,
          unitIds,
          upgradeIds,
          ruleCollection.locations.get(rule) ?? "rules",
          packageErrors,
        )
      }

      if (packageErrors.length > 0) {
        errors.push(...packageErrors)
        continue
      }

      if (!isNonEmptyString(game.id)) {
        continue
      }

      packages.push({
        game: { ...game, id: game.id },
        factions,
        units,
        upgrades,
        rules,
      })
    }

    if (errors.length > 0) {
      throw new GamePackageError("Invalid game package data", errors)
    }

    return packages
  }
}
