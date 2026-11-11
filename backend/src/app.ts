import express from "express";
import healthRoutes from "./routes/health.routes.ts";

const app = express();

app.use(express.json());

app.use("/health", healthRoutes);

app.use((_req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

export default app;