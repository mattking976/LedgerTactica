import { Router } from "express";
import { appConfig } from "../config/appConfig.ts";

const router = Router();

router.get("/", (_req, res) => {
    res.status(200).json({
    status: "ok",
    service: appConfig.name,
    version: appConfig.version,
    });
});

export default router;
