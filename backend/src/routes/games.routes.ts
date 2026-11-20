import { Router } from "express"
import type { NextFunction, Request, Response } from "express"
import { GamePackageError } from "../types/gamePackage.ts"
import type { GamePackageLoader } from "../services/gamePackageLoader.ts"

const createGamesRouter = (loader: GamePackageLoader) => {
  const router = Router()

  router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ games: await loader.listGames() })
    } catch (error) {
      if (error instanceof GamePackageError) {
        res.status(500).json({
          error: error.message,
          details: error.details,
        })
        return
      }
      next(error)
    }
  })

  router.get(
    "/:gameId",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const gameId = req.params.gameId
        const normalizedGameId = Array.isArray(gameId) ? gameId[0] : gameId
        const gamePackage = normalizedGameId
          ? await loader.getGame(normalizedGameId)
          : undefined
        if (!gamePackage) {
          res.status(404).json({ error: "Game not found" })
          return
        }
        res.json(gamePackage)
      } catch (error) {
        if (error instanceof GamePackageError) {
          res.status(500).json({
            error: error.message,
            details: error.details,
          })
          return
        }
        next(error)
      }
    },
  )

  return router
}

export default createGamesRouter
