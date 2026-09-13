import { expect, it } from "vitest"

import { channelCollection } from "../mongodb.mts"
import { call, createChannel } from "../testUtils/index.mts"
import { buildFeedUrlToSubscribe } from "../utils.mts"

const send = async (params?: URLSearchParams) => {
  const response = await call("/pubsubhubbub", { params })

  if (response.status === 400) {
    return response
  }

  expect(response.status).toBe(200)

  expect(response.headers.get("content-type")).toBe("text/plain")

  await expect(response.text()).resolves.toBe("challenge")

  return response
}

const buildParams = (value?: Record<string, string>) =>
  new URLSearchParams({
    "hub.challenge": "challenge",
    "hub.topic": buildFeedUrlToSubscribe("channelId"),
    "hub.mode": "subscribe",
    ...value,
  })

it("should return 400", async () => {
  {
    const { status } = await send()

    expect(status).toBe(400)
  }

  {
    const { status } = await send(
      buildParams({ "hub.topic": "https://foo.com" }),
    )

    expect(status).toBe(400)
  }
})

it("should ignore stale verification", async () => {
  await createChannel()

  await send(buildParams())

  await expect(
    channelCollection.findOne({ _id: "channelId" }),
  ).resolves.toMatchObject({ lastConfirmedAt: null })
})

it("should unsubscribe", async () => {
  await createChannel({ lastRequestedAt: new Date() })

  await send(buildParams({ "hub.mode": "unsubscribe" }))

  await expect(
    channelCollection.findOne({ _id: "channelId" }),
  ).resolves.toBeNull()
})

it("should subscribe", async () => {
  await createChannel({ lastRequestedAt: new Date() })

  await send(buildParams())

  await expect(
    channelCollection.findOne({ _id: "channelId" }),
  ).resolves.toMatchObject({ lastConfirmedAt: expect.any(Date) })
})
