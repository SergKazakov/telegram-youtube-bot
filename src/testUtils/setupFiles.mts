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

  return async () => {
    await mongoClient.close()
  }
})

beforeEach(() => cleanup())
