import { expect, it } from "vitest"

import { call } from "../testUtils/index.mts"

it("should return 204", async () => {
  const { status } = await call("/healthcheck", { method: "HEAD" })

  expect(status).toBe(204)
})
