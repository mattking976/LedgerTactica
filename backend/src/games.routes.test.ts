import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import request from "supertest"
import { createApp } from "./app.ts"

const game = {
  id: "sample-game",
  name: "Sample Game",
  version: "1st Edition",
  releaseDate: "2026-01-01",
  status: "active",
  supported: true,
}

const faction = {
  id: "sample-faction",
  gameId: "sample-game",
  name: "Sample Faction",
  supported: true,
}

const unit = {
  id: "sample-unit",
  factionId: "sample-faction",
  name: "Sample Unit",
  baseCost: 100,
  costModel: { type: "fixed" },
  minSize: 1,
  maxSize: 1,
  availableUpgrades: [
    { upgradeId: "sample-upgrade", min: 0, max: 1 },
  ],
  tags: ["troops"],
  supported: true,
}

const upgrade = {
  id: "sample-upgrade",
  name: "Sample Upgrade",
  category: "wargear",
  cost: 10,
  costModel: "flat",
  tags: [],
  supported: true,
}

const rule = {
  id: "sample-rule",
  type: "required-tag",
  tag: "troops",
  unitId: "sample-unit",
  upgradeId: "sample-upgrade",
}

const writeJson = async (filePath: string, value: unknown) => {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(value), "utf8")
}

const createPackage = async (
  dataDirectory: string,
  options: {
    game?: unknown
    factions?: unknown[]
    units?: unknown[]
    upgrades?: unknown[]
    rules?: unknown[]
  } = {},
) => {
  const packagePath = path.join(dataDirectory, "sample-game")
  await writeJson(
    path.join(packagePath, "game.json"),
    options.game ?? game,
  )

  const collections = {
    factions: options.factions ?? [faction],
    units: options.units ?? [unit],
    upgrades: options.upgrades ?? [upgrade],
    rules: options.rules ?? [rule],
  }

  for (const [collection, definitions] of Object.entries(collections)) {
    const collectionPath = path.join(packagePath, collection)
    await mkdir(collectionPath, { recursive: true })
    for (const definition of definitions) {
      const id =
        typeof definition === "object" && definition !== null && "id" in definition
          ? String(definition.id)
          : "invalid"
      await writeJson(path.join(collectionPath, `${id}.json`), definition)
    }
  }
}

describe("Game catalog API", () => {
  let dataDirectory: string

  beforeEach(async () => {
    dataDirectory = await mkdtemp(path.join(os.tmpdir(), "ledger-tactica-"))
  })

  afterEach(async () => {
    await rm(dataDirectory, { recursive: true, force: true })
  })

  it("lists games and returns a game's selectable catalog", async () => {
    await createPackage(dataDirectory)
    const app = createApp(dataDirectory)

    const gamesResponse = await request(app).get("/games")
    expect(gamesResponse.status).toBe(200)
    expect(gamesResponse.body).toEqual({ games: [game] })

    const catalogResponse = await request(app).get("/games/sample-game")
    expect(catalogResponse.status).toBe(200)
    expect(catalogResponse.body).toEqual({
      game,
      factions: [faction],
      units: [unit],
      upgrades: [upgrade],
      rules: [rule],
    })
  })

  it("accepts the supported Unit cost models", async () => {
    const perModelUnit = {
      ...unit,
      id: "per-model-unit",
      costModel: {
        type: "per-model",
        additionalModelCost: 10,
      },
    }
    const tieredUnit = {
      ...unit,
      id: "tiered-unit",
      minSize: 5,
      maxSize: 10,
      costModel: {
        type: "size-tier",
        tiers: [
          { minSize: 5, maxSize: 7, cost: 100 },
          { minSize: 8, maxSize: 10, cost: 140 },
        ],
      },
    }
    const app = createApp(dataDirectory)
    await createPackage(dataDirectory, {
      units: [unit, perModelUnit, tieredUnit],
      upgrades: [
        upgrade,
        { ...upgrade, id: "per-model-upgrade", costModel: "per-model" },
      ],
    })

    const response = await request(app).get("/games/sample-game")

    expect(response.status).toBe(200)
    expect(response.body.units).toHaveLength(3)
    expect(response.body.upgrades).toHaveLength(2)
  })

  it("returns not found for an unknown game", async () => {
    const response = await request(createApp(dataDirectory)).get(
      "/games/missing-game",
    )

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: "Game not found" })
  })

  it("reports invalid JSON instead of returning a partial catalog", async () => {
    await createPackage(dataDirectory)
    await writeFile(
      path.join(dataDirectory, "sample-game", "units", "broken.json"),
      "{",
      "utf8",
    )

    const response = await request(createApp(dataDirectory)).get("/games")

    expect(response.status).toBe(500)
    expect(response.body.error).toBe("Invalid game package data")
    expect(
      response.body.details.some((detail: string) =>
        detail.includes("units/broken.json: contains invalid JSON"),
      ),
    ).toBe(true)
  })

  it("reports invalid game metadata and package IDs", async () => {
    await createPackage(dataDirectory, {
      game: {
        ...game,
        id: "different-game",
        releaseDate: "2026-02-30",
        status: "unsupported",
        supported: "yes",
      },
    })

    const response = await request(createApp(dataDirectory)).get("/games")
    const details = response.body.details.join("\n")

    expect(response.status).toBe(500)
    expect(details).toContain('"releaseDate" must be a valid ISO date')
    expect(details).toContain('"status" must be active, legacy, or archived')
    expect(details).toContain('"supported" must be a boolean')
    expect(details).toContain('must match the package directory "sample-game"')
  })

  it("rejects invalid Unit costs, sizing, tags, and upgrade constraints", async () => {
    await createPackage(dataDirectory, {
      units: [
        {
          ...unit,
          factionId: "missing-faction",
          baseCost: -1,
          minSize: 5,
          maxSize: 3,
          costModel: {
            type: "per-model",
            additionalModelCost: -2,
          },
          availableUpgrades: [
            { upgradeId: "missing-upgrade", min: -1, max: -2 },
            null,
          ],
          tags: [],
          supported: "yes",
        },
      ],
    })

    const response = await request(createApp(dataDirectory)).get("/games")
    const details = response.body.details.join("\n")

    expect(response.status).toBe(500)
    expect(details).toContain('"baseCost" must be a non-negative number')
    expect(details).toContain('"maxSize" must be at least "minSize"')
    expect(details).toContain('"costModel.additionalModelCost" must be a non-negative number')
    expect(details).toContain('references missing faction "missing-faction"')
    expect(details).toContain('"availableUpgrades" references missing upgrade "missing-upgrade"')
    expect(details).toContain("available upgrade min must be a non-negative integer")
    expect(details).toContain("each available upgrade must be an object")
  })

  it("rejects faction mismatches and dangling rule references", async () => {
    await createPackage(dataDirectory, {
      factions: [{ ...faction, gameId: "another-game" }],
      rules: [
        {
          ...rule,
          unitId: "missing-unit",
          upgradeId: "missing-upgrade",
        },
      ],
    })

    const response = await request(createApp(dataDirectory)).get("/games")
    const details = response.body.details.join("\n")

    expect(response.status).toBe(500)
    expect(details).toContain('"gameId" must reference "sample-game"')
    expect(details).toContain('references missing unit "missing-unit"')
    expect(details).toContain('references missing upgrade "missing-upgrade"')
  })

  it("reports incomplete packages and missing collections", async () => {
    await writeJson(
      path.join(dataDirectory, "incomplete-package", "factions", "stray.json"),
      { id: "stray" },
    )

    const missingGameResponse = await request(createApp(dataDirectory)).get(
      "/games",
    )
    expect(missingGameResponse.status).toBe(500)
    expect(missingGameResponse.body.details).toContain(
      'incomplete-package: package contains data but is missing "game.json"',
    )

    await rm(path.join(dataDirectory, "incomplete-package"), {
      recursive: true,
      force: true,
    })
    await createPackage(dataDirectory)
    await rm(path.join(dataDirectory, "sample-game", "rules"), {
      recursive: true,
    })

    const missingCollectionResponse = await request(createApp(dataDirectory)).get(
      "/games",
    )
    expect(missingCollectionResponse.status).toBe(500)
    expect(
      missingCollectionResponse.body.details.some((detail: string) =>
        detail.includes("rules: directory is missing or could not be read"),
      ),
    ).toBe(true)
  })

  it("rejects duplicate IDs in a collection", async () => {
    await createPackage(dataDirectory, {
      units: [
        unit,
        { ...unit, id: "another-unit" },
      ],
    })
    await writeJson(
      path.join(dataDirectory, "sample-game", "units", "duplicate.json"),
      { ...unit, id: "sample-unit" },
    )

    const response = await request(createApp(dataDirectory)).get("/games")

    expect(response.status).toBe(500)
    expect(
      response.body.details.some((detail: string) =>
        detail.includes('duplicate id "sample-unit"'),
      ),
    ).toBe(true)
  })

  it("rejects dangling cross-references", async () => {
    await createPackage(dataDirectory, {
      units: [{ ...unit, factionId: "missing-faction" }],
    })

    const response = await request(createApp(dataDirectory)).get("/games")

    expect(response.status).toBe(500)
    expect(
      response.body.details.some((detail: string) =>
        detail.includes('references missing faction "missing-faction"'),
      ),
    ).toBe(true)
  })
})
