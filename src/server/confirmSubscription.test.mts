import { expect, it } from "vitest"

import { channelCollection } from "../mongodb.mts"
import { client, createChannel } from "../testUtils/index.mts"
import { buildFeedUrl } from "../utils.mts"

const confirmSubscription = (params?: Record<string, string>) =>
  client("/pubsubhubbub", { params })

it("should return 400", async () => {
  const { status } = await confirmSubscription()

  expect(status).toBe(400)
})

it("should return the challenge and record confirmation", async () => {
  await createChannel()

  const { status, data, headers } = await confirmSubscription({
    "hub.challenge": "challenge",
    "hub.topic": buildFeedUrl("channelId"),
    "hub.mode": "subscribe",
  })

  expect(status).toBe(200)

  expect(headers["content-type"]).toBe("text/plain")

  expect(data).toBe("challenge")

  await expect(
    channelCollection.findOne({ _id: "channelId" }),
  ).resolves.toMatchObject({
    nextAttemptAt: expect.any(Date),
    lastConfirmedAt: expect.any(Date),
  })
})
