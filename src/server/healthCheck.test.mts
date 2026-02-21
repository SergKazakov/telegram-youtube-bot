import { expect, it } from "vitest"

import { client } from "../testUtils/index.mts"

it("should return 204", async () => {
  const { status } = await client.head("/healthcheck")

  expect(status).toBe(204)
})
