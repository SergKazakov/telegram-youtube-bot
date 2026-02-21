import { expect, it } from "vitest"

import { client } from "../testUtils/index.mts"

const getPubSubHubBub = (params?: Record<string, string>) =>
  client("/pubsubhubbub", { params })

it("should return 400", async () => {
  const { status } = await getPubSubHubBub()

  expect(status).toBe(400)
})

it("should return the challenge from hub.challenge query param", async () => {
  const { status, data, headers } = await getPubSubHubBub({
    "hub.challenge": "foo",
  })

  expect(status).toBe(200)

  expect(headers["content-type"]).toBe("text/plain")

  expect(data).toBe("foo")
})
