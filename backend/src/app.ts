import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import healthRoutes from "./routes/health.routes.ts";
import createGamesRouter from "./routes/games.routes.ts";
import { GamePackageLoader } from "./services/gamePackageLoader.ts";

const defaultDataDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data",
);

export const createApp = (dataDirectory = defaultDataDirectory) => {
  const app = express();

  app.use(express.json());

  app.use("/health", healthRoutes);
  app.use("/games", createGamesRouter(new GamePackageLoader(dataDirectory)));

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
      console.error("Unhandled API error", error);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
};

const app = createApp();

export default app;