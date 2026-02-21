import { type AddressInfo } from "node:net"

import { beforeAll, beforeEach, vi } from "vitest"

process.env.MONGODB_URL = `${process.env.MONGODB_CONNECTION_STRING}/${process.env.VITEST_POOL_ID}?directConnection=true`

vi.mock("../bot/index.mts")

vi.mock("../utils.mts")

beforeAll(async () => {
  const { server } = await import("../server/index.mts")

  await new Promise<void>(resolve => server.listen(0, resolve))

  const { setupClient } = await import("./index.mts")

  setupClient((server.address() as AddressInfo).port)

  return async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))

    const { mongoClient } = await import("../mongodb.mts")

    await mongoClient.close()
  }
})

beforeEach(async () => {
  const { db } = await import("../mongodb.mts")

  await db.dropDatabase()
})
