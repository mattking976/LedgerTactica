import { Router } from "express"
import type { NextFunction, Request, Response } from "express"
import type { GamePackageLoader } from "../services/gamePackageLoader.ts"
import { GamePackageError, type JsonObject } from "../types/gamePackage.ts"
import {
  addRosterEntry,
  createRoster,
} from "../services/rosterOperations.ts"
import {
  RosterStorage,
  RosterStorageError,
  validateRosterData,
} from "../services/rosterStorage.ts"
import type {
  RosterCatalog,
  RosterOperationError,
  AvailableUpgrade,
} from "../types/roster.ts"

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0

const getCatalog = (
  gamePackage: Awaited<ReturnType<GamePackageLoader["getGame"]>>,
): RosterCatalog | undefined => {
  if (!gamePackage || gamePackage.game.supported !== true) {
    return undefined
  }

  const factionIds: string[] = []
  for (const faction of gamePackage.factions) {
    if (
      !isRecord(faction) ||
      !isNonEmptyString(faction.id) ||
      typeof faction.supported !== "boolean"
    ) {
      return undefined
    }
    if (faction.supported) {
      factionIds.push(faction.id)
    }
  }

  const upgradeIds: string[] = []
  for (const upgrade of gamePackage.upgrades) {
    if (
      !isRecord(upgrade) ||
      !isNonEmptyString(upgrade.id) ||
      typeof upgrade.supported !== "boolean"
    ) {
      return undefined
    }
    if (upgrade.supported) {
      upgradeIds.push(upgrade.id)
    }
  }

  const units: RosterCatalog["units"][number][] = []
  for (const unit of gamePackage.units) {
    if (
      !isRecord(unit) ||
      !isNonEmptyString(unit.id) ||
      !isNonEmptyString(unit.factionId) ||
      !isPositiveInteger(unit.minSize) ||
      !isPositiveInteger(unit.maxSize) ||
      typeof unit.supported !== "boolean"
    ) {
      return undefined
    }

    let availableUpgrades: RosterCatalog["units"][number]["availableUpgrades"]
    if (unit.availableUpgrades !== undefined) {
      if (!Array.isArray(unit.availableUpgrades)) {
        return undefined
      }
      const parsed: AvailableUpgrade[] = []
      for (const available of unit.availableUpgrades) {
        if (
          !isRecord(available) ||
          !isNonEmptyString(available.upgradeId) ||
          (available.min !== undefined &&
            !isNonNegativeInteger(available.min)) ||
          (available.max !== undefined &&
            !isNonNegativeInteger(available.max))
        ) {
          return undefined
        }
        const min = available.min ?? 0
        const max = available.max ?? 1
        if (max < min) {
          return undefined
        }
        parsed.push({
          upgradeId: available.upgradeId,
          ...(available.min !== undefined &&
          isNonNegativeInteger(available.min)
            ? { min: available.min }
            : {}),
          ...(available.max !== undefined &&
          isNonNegativeInteger(available.max)
            ? { max: available.max }
            : {}),
        })
      }
      availableUpgrades = parsed
    }

    if (unit.supported) {
      units.push({
        id: unit.id,
        factionId: unit.factionId,
        minSize: unit.minSize,
        maxSize: unit.maxSize,
        ...(availableUpgrades ? { availableUpgrades } : {}),
      })
    }
  }

  return {
    gameId: gamePackage.game.id,
    factionIds,
    units,
    upgradeIds,
  }
}

const validateRosterReferences = async (
  roster: ReturnType<typeof validateRosterData>,
  loader: GamePackageLoader,
): Promise<RosterOperationError | undefined> => {
  const gamePackage = await loader.getGame(roster.gameId)
  const catalog = getCatalog(gamePackage)
  if (!catalog) {
    return {
      code: "invalid-game",
      message: `Game "${roster.gameId}" does not have a supported roster catalog`,
    }
  }

  const created = createRoster(
    {
      name: roster.name,
      gameId: roster.gameId,
      factionId: roster.factionId,
      pointsLimit: roster.pointsLimit,
    },
    catalog,
    () => roster.id,
  )
  if (!created.ok) {
    return created.error
  }

  let current = created.value
  for (const entry of roster.rosterEntries) {
    const added = addRosterEntry(
      current,
      catalog,
      entry.unitId,
      entry.quantity,
      entry.selectedUpgrades,
      () => entry.id,
    )
    if (!added.ok) {
      return added.error
    }
    current = added.value
  }
}

const operationError = (
  error: RosterOperationError,
  status: number,
  res: Response,
) => res.status(status).json({ error: error.message, code: error.code })

const storageErrorStatus = (error: RosterStorageError): number => {
  if (error.code === "invalid-roster" || error.code === "invalid-roster-id") {
    return 400
  }
  if (error.code === "not-found") {
    return 404
  }
  if (error.code === "already-exists") {
    return 409
  }
  return 500
}

const handleError = (
  error: unknown,
  res: Response,
  next: NextFunction,
) => {
  if (error instanceof RosterStorageError) {
    res.status(storageErrorStatus(error)).json({
      error: error.message,
      code: error.code,
      ...(error.details.length > 0 ? { details: error.details } : {}),
    })
    return
  }
  if (error instanceof GamePackageError) {
    res.status(500).json({ error: error.message, details: error.details })
    return
  }
  next(error)
}

const getRosterId = (req: Request): string | undefined => {
  const id = req.params.rosterId
  return Array.isArray(id) ? id[0] : id
}

const createRostersRouter = (
  storage: RosterStorage,
  loader: GamePackageLoader,
) => {
  const router = Router()

  router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rosters = await storage.list()
      for (const roster of rosters) {
        const validationError = await validateRosterReferences(roster, loader)
        if (validationError) {
          res.status(500).json({
            error: `Stored roster "${roster.id}" is invalid`,
            code: validationError.code,
            details: [validationError.message],
          })
          return
        }
      }
      res.json({ rosters })
    } catch (error) {
      handleError(error, res, next)
    }
  })

  router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roster = validateRosterData(req.body)
      const validationError = await validateRosterReferences(roster, loader)
      if (validationError) {
        operationError(validationError, 400, res)
        return
      }
      res.status(201).json({ roster: await storage.create(roster) })
    } catch (error) {
      handleError(error, res, next)
    }
  })

  router.get(
    "/:rosterId",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rosterId = getRosterId(req)
        if (!rosterId) {
          res.status(400).json({ error: "Roster ID is required" })
          return
        }
        const roster = await storage.get(rosterId)
        const validationError = await validateRosterReferences(roster, loader)
        if (validationError) {
          res.status(500).json({
            error: `Stored roster "${roster.id}" is invalid`,
            code: validationError.code,
            details: [validationError.message],
          })
          return
        }
        res.json({ roster })
      } catch (error) {
        handleError(error, res, next)
      }
    },
  )

  router.put(
    "/:rosterId",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rosterId = getRosterId(req)
        if (!rosterId) {
          res.status(400).json({ error: "Roster ID is required" })
          return
        }
        await storage.get(rosterId)
        const roster = validateRosterData(req.body)
        if (roster.id !== rosterId) {
          res.status(400).json({
            error: `Roster body ID "${roster.id}" does not match URL ID "${rosterId}"`,
            code: "invalid-roster",
          })
          return
        }
        const validationError = await validateRosterReferences(roster, loader)
        if (validationError) {
          operationError(validationError, 400, res)
          return
        }
        res.json({ roster: await storage.update(rosterId, roster) })
      } catch (error) {
        handleError(error, res, next)
      }
    },
  )

  router.delete(
    "/:rosterId",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rosterId = getRosterId(req)
        if (!rosterId) {
          res.status(400).json({ error: "Roster ID is required" })
          return
        }
        await storage.delete(rosterId)
        res.status(204).end()
      } catch (error) {
        handleError(error, res, next)
      }
    },
  )

  return router
}

export default createRostersRouter
