import { type AddressInfo } from "node:net"

import { beforeAll, beforeEach, vi } from "vitest"

process.env.MONGODB_URL = `${process.env.MONGODB_CONNECTION_STRING}/${process.env.VITEST_POOL_ID}?directConnection=true`

vi.mock("../bot/index.mts")

vi.mock("../utils.mts")

beforeAll(async () => {
  const { createServer } = await import("../server/index.mts")

  const { server, listen } = createServer(0)

  const close = await listen()

  const { setupClient } = await import("./index.mts")

  setupClient((server.address() as AddressInfo).port)

  return async () => {
    await close()

    const { mongoClient } = await import("../mongodb.mts")

    await mongoClient.close()
  }
})

beforeEach(async () => {
  const { db } = await import("../mongodb.mts")

  await db.dropDatabase()
})
