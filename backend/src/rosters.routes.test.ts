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

const upgrade = {
  id: "sample-upgrade",
  name: "Sample Upgrade",
  category: "wargear",
  cost: 10,
  supported: true,
}

const unit = {
  id: "sample-unit",
  factionId: "sample-faction",
  name: "Sample Unit",
  baseCost: 100,
  minSize: 1,
  maxSize: 5,
  availableUpgrades: [{ upgradeId: "sample-upgrade", min: 0, max: 1 }],
  tags: ["troops"],
  supported: true,
}

const roster = {
  id: "roster-1",
  name: " Test Roster ",
  gameId: "sample-game",
  factionId: "sample-faction",
  pointsLimit: 1000,
  rosterEntries: [
    {
      id: "entry-1",
      unitId: "sample-unit",
      quantity: 5,
      selectedUpgrades: [{ upgradeId: "sample-upgrade", quantity: 1 }],
    },
  ],
  supported: true,
}

const writeJson = async (filePath: string, value: unknown) => {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(value), "utf8")
}

const createGamePackage = async (dataDirectory: string) => {
  const packagePath = path.join(dataDirectory, game.id)
  await writeJson(path.join(packagePath, "game.json"), game)
  for (const [collection, definitions] of Object.entries({
    factions: [faction],
    units: [unit],
    upgrades: [upgrade],
    rules: [],
  })) {
    const collectionPath = path.join(packagePath, collection)
    await mkdir(collectionPath, { recursive: true })
    for (const definition of definitions) {
      const id = "id" in definition ? String(definition.id) : "invalid"
      await writeJson(path.join(collectionPath, `${id}.json`), definition)
    }
  }
}

describe("Roster persistence API", () => {
  let temporaryDirectory: string
  let dataDirectory: string
  let storageDirectory: string

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "ledger-rosters-"))
    dataDirectory = path.join(temporaryDirectory, "games")
    storageDirectory = path.join(temporaryDirectory, "rosters")
    await createGamePackage(dataDirectory)
  })

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true })
  })

  it("creates, lists, reads, updates, restarts, and deletes rosters", async () => {
    const emptyListResponse = await request(
      createApp(dataDirectory, storageDirectory),
    ).get("/rosters")
    expect(emptyListResponse.status).toBe(200)
    expect(emptyListResponse.body).toEqual({ rosters: [] })

    const createResponse = await request(
      createApp(dataDirectory, storageDirectory),
    )
      .post("/rosters")
      .send(roster)

    expect(createResponse.status).toBe(201)
    expect(createResponse.body.roster.name).toBe("Test Roster")

    const appAfterRestart = createApp(dataDirectory, storageDirectory)
    const getResponse = await request(appAfterRestart).get("/rosters/roster-1")
    expect(getResponse.status).toBe(200)
    expect(getResponse.body.roster).toEqual(createResponse.body.roster)

    const listResponse = await request(appAfterRestart).get("/rosters")
    expect(listResponse.status).toBe(200)
    expect(listResponse.body).toEqual({
      rosters: [createResponse.body.roster],
    })

    const updatedRoster = {
      ...roster,
      name: "Updated Test Roster",
      rosterEntries: [],
    }
    const updateResponse = await request(appAfterRestart)
      .put("/rosters/roster-1")
      .send(updatedRoster)
    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.roster.name).toBe("Updated Test Roster")
    expect(updateResponse.body.roster.rosterEntries).toEqual([])

    const appAfterUpdateRestart = createApp(dataDirectory, storageDirectory)
    const updatedGetResponse = await request(appAfterUpdateRestart).get(
      "/rosters/roster-1",
    )
    expect(updatedGetResponse.status).toBe(200)
    expect(updatedGetResponse.body.roster.name).toBe("Updated Test Roster")

    const deleteResponse = await request(appAfterUpdateRestart).delete(
      "/rosters/roster-1",
    )
    expect(deleteResponse.status).toBe(204)
    expect(
      (await request(appAfterUpdateRestart).get("/rosters/roster-1")).status,
    ).toBe(404)
  })

  it("reports invalid roster payloads, references, IDs, and missing records", async () => {
    const app = createApp(dataDirectory, storageDirectory)

    const invalidPayloadResponse = await request(app)
      .post("/rosters")
      .send({ ...roster, pointsLimit: -1 })
    expect(invalidPayloadResponse.status).toBe(400)
    expect(invalidPayloadResponse.body.code).toBe("invalid-roster")

    const unknownFieldResponse = await request(app)
      .post("/rosters")
      .send({ ...roster, ignoredField: true })
    expect(unknownFieldResponse.status).toBe(400)
    expect(unknownFieldResponse.body.code).toBe("invalid-roster")

    const invalidReferenceResponse = await request(app)
      .post("/rosters")
      .send({ ...roster, id: "bad-reference", factionId: "missing-faction" })
    expect(invalidReferenceResponse.status).toBe(400)
    expect(invalidReferenceResponse.body.code).toBe("invalid-faction")

    const invalidUnitResponse = await request(app)
      .post("/rosters")
      .send({
        ...roster,
        id: "bad-unit",
        rosterEntries: [{
          id: "entry-1",
          unitId: "missing-unit",
          quantity: 1,
          selectedUpgrades: [],
        }],
      })
    expect(invalidUnitResponse.status).toBe(400)
    expect(invalidUnitResponse.body.code).toBe("invalid-unit")

    const invalidUpgradeResponse = await request(app)
      .post("/rosters")
      .send({
        ...roster,
        id: "bad-upgrade",
        rosterEntries: [{
          ...roster.rosterEntries[0],
          selectedUpgrades: [{ upgradeId: "missing-upgrade", quantity: 1 }],
        }],
      })
    expect(invalidUpgradeResponse.status).toBe(400)
    expect(invalidUpgradeResponse.body.code).toBe("unknown-upgrade")

    const unsafeIdResponse = await request(app)
      .post("/rosters")
      .send({ ...roster, id: "../outside" })
    expect(unsafeIdResponse.status).toBe(400)
    expect(unsafeIdResponse.body.code).toBe("invalid-roster-id")

    expect((await request(app).get("/rosters/missing")).status).toBe(404)
    expect((await request(app).delete("/rosters/missing")).status).toBe(404)
    expect(
      (await request(app).put("/rosters/missing").send(roster)).status,
    ).toBe(404)

    const invalidJsonResponse = await request(app)
      .post("/rosters")
      .set("Content-Type", "application/json")
      .send("{")
    expect(invalidJsonResponse.status).toBe(400)
    expect(invalidJsonResponse.body.error).toBe(
      "Request body contains invalid JSON",
    )
  })

  it("rejects duplicate creates and mismatched update IDs", async () => {
    const app = createApp(dataDirectory, storageDirectory)
    await request(app).post("/rosters").send(roster).expect(201)

    const duplicateResponse = await request(app).post("/rosters").send(roster)
    expect(duplicateResponse.status).toBe(409)
    expect(duplicateResponse.body.code).toBe("already-exists")

    const mismatchResponse = await request(app)
      .put("/rosters/roster-1")
      .send({ ...roster, id: "another-roster" })
    expect(mismatchResponse.status).toBe(400)
    expect(mismatchResponse.body.code).toBe("invalid-roster")
  })

  it("reports malformed persisted JSON and filesystem failures explicitly", async () => {
    await mkdir(storageDirectory, { recursive: true })
    await writeFile(
      path.join(storageDirectory, "broken.json"),
      "{",
      "utf8",
    )
    const malformedResponse = await request(
      createApp(dataDirectory, storageDirectory),
    ).get("/rosters")
    expect(malformedResponse.status).toBe(500)
    expect(malformedResponse.body.code).toBe("malformed-storage")
    expect(malformedResponse.body.details).toHaveLength(1)

    await rm(storageDirectory, { recursive: true, force: true })
    await writeJson(path.join(storageDirectory, "invalid-roster.json"), {
      ...roster,
      factionId: "missing-faction",
      id: "invalid-roster",
    })
    const invalidStoredRosterResponse = await request(
      createApp(dataDirectory, storageDirectory),
    ).get("/rosters/invalid-roster")
    expect(invalidStoredRosterResponse.status).toBe(500)
    expect(invalidStoredRosterResponse.body.error).toContain(
      'Stored roster "invalid-roster" is invalid',
    )
    expect(invalidStoredRosterResponse.body.code).toBe("invalid-faction")

    const blockedStoragePath = path.join(temporaryDirectory, "not-a-directory")
    await writeFile(blockedStoragePath, "file", "utf8")
    const storageFailureResponse = await request(
      createApp(dataDirectory, blockedStoragePath),
    )
      .post("/rosters")
      .send(roster)
    expect(storageFailureResponse.status).toBe(500)
    expect(storageFailureResponse.body.code).toBe("storage-failure")
  })
})
