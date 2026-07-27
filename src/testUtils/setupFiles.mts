import { beforeAll, beforeEach, vi } from "vitest"

Bun.env.MONGODB_URL = `${Bun.env.MONGODB_CONNECTION_STRING}/${Bun.env.VITEST_POOL_ID}`

vi.mock("../bot/index.mts")

vi.mock("../utils.mts")

beforeAll(async () => {
  const { createServer } = await import("../server/createServer.mts")

  const { setupClient } = await import("./index.mts")

  const server = createServer()

  setupClient(server.url.port)

  return async () => {
    await server.stop()

    const { mongoClient } = await import("../mongodb.mts")

    await mongoClient.close()
  }
})

beforeEach(async () => {
  const { db, setupDatabase } = await import("../mongodb.mts")

  await db.dropDatabase()

  await setupDatabase()
})
