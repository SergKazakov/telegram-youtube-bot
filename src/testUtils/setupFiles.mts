import { tmpdir } from "node:os"
import { join } from "node:path"

import { ObjectId } from "mongodb"
import { beforeAll, beforeEach, vi } from "vitest"

Bun.env.MONGODB_URL = `${Bun.env.MONGODB_CONNECTION_STRING}/${Bun.env.VITEST_POOL_ID}`

vi.mock("../bot/index.mts")

vi.mock("../utils.mts")

let cleanup: () => Promise<void>

beforeAll(async () => {
  const {
    cleanup: _cleanup,
    mongoClient,
    setupDatabase,
  } = await import("../mongodb.mts")

  cleanup = _cleanup

  await setupDatabase()

  const { createServer } = await import("../server/createServer.mts")

  const { setupClient } = await import("./index.mts")

  const server = createServer(join(tmpdir(), `${new ObjectId()}.sock`))

  setupClient(server.url.pathname)

  return async () => {
    await server.stop(true)

    await mongoClient.close()
  }
})

beforeEach(() => cleanup())
