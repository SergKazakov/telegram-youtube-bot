import { expect, it } from "vitest"

import { channelCollection } from "../mongodb.mts"
import { client, createChannel } from "../testUtils/index.mts"
import { buildFeedUrlToSubscribe } from "../utils.mts"

const confirmSubscription = async (params: Record<string, string>) => {
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
    const { status } = await confirmSubscription({})

    expect(status).toBe(400)
  }

  {
    const { status } = await confirmSubscription(
      buildParams({ "hub.topic": "https://foo.com" }),
    )

    expect(status).toBe(400)
  }
})

it("should ignore stale verification", async () => {
  await createChannel()

  await confirmSubscription(buildParams())

  await expect(
    channelCollection.findOne({ _id: "channelId" }),
  ).resolves.toMatchObject({ lastConfirmedAt: null })
})

it("should unsubscribe", async () => {
  await createChannel({ lastRequestedAt: new Date() })

  await confirmSubscription(buildParams({ "hub.mode": "unsubscribe" }))

  await expect(
    channelCollection.findOne({ _id: "channelId" }),
  ).resolves.toBeNull()
})

it("should subscribe", async () => {
  await createChannel({ lastRequestedAt: new Date() })

  await confirmSubscription(buildParams())

  await expect(
    channelCollection.findOne({ _id: "channelId" }),
  ).resolves.toMatchObject({ lastConfirmedAt: expect.any(Date) })
})
