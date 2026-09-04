import { expect, it } from "vitest"

import { client, createChannel, expectChannel } from "../testUtils/index.mts"
import { buildFeedUrlToSubscribe } from "../utils.mts"

const send = async (params: Record<string, string>) => {
  const response = await client("/pubsubhubbub", { params })

  if (response.status === 400) {
    return response
  }

  expect(response.status).toBe(200)

  expect(response.headers["content-type"]).toBe("text/plain")

  expect(response.data).toBe("challenge")

  return response
}

const buildParams = (value?: Record<string, string>) => ({
  "hub.challenge": "challenge",
  "hub.topic": buildFeedUrlToSubscribe("channelId"),
  "hub.mode": "subscribe",
  ...value,
})

it("should return 400", async () => {
  {
    const { status } = await send({})

    expect(status).toBe(400)
  }

  {
    const { status } = await send(
      buildParams({ "hub.topic": "https://foo.com" }),
    )

    expect(status).toBe(400)
  }
})

it("should ignore the stale verification", async () => {
  await createChannel()

  await send(buildParams())

  await expectChannel({ lastConfirmedAt: null })
})

it("should unsubscribe", async () => {
  await createChannel({ lastRequestedAt: new Date() })

  await send(buildParams({ "hub.mode": "unsubscribe" }))

  await expectChannel(null)
})

it("should subscribe", async () => {
  await createChannel({ lastRequestedAt: new Date() })

  await send(buildParams())

  await expectChannel({ lastConfirmedAt: expect.any(Date) })
})
