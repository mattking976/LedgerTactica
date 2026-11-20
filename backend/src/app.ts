import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import healthRoutes from "./routes/health.routes.ts";
import createGamesRouter from "./routes/games.routes.ts";
import createRostersRouter from "./routes/rosters.routes.ts";
import { GamePackageLoader } from "./services/gamePackageLoader.ts";
import { RosterStorage } from "./services/rosterStorage.ts";

const defaultDataDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data",
);
const defaultRosterDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../storage/rosters",
);

export const createApp = (
  dataDirectory = defaultDataDirectory,
  rosterDirectory = defaultRosterDirectory,
) => {
  const app = express();
  const gameLoader = new GamePackageLoader(dataDirectory);

  app.use(express.json());

  app.use("/health", healthRoutes);
  app.use("/games", createGamesRouter(gameLoader));
  app.use(
    "/rosters",
    createRostersRouter(new RosterStorage(rosterDirectory), gameLoader),
  );

  app.use((_req, res) => {
    res.status(404).json({
      error: "Route not found",
    });
  });

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof SyntaxError && "body" in error) {
        res.status(400).json({ error: "Request body contains invalid JSON" });
        return;
      }
      console.error("Unhandled API error", error);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
};

const app = createApp();

export default app;