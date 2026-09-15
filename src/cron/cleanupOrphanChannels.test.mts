import { expect, it } from "vitest"

import {
  DEFAULT_CHANNEL,
  channelCollection,
  subscriptionCollection,
} from "../mongodb.mts"

import { cleanupOrphanChannels } from "./cleanupOrphanChannels.mts"

it("should delete orphan channels and keep subscribed ones", async () => {
  await channelCollection.insertMany([
    { ...DEFAULT_CHANNEL, _id: "orphan" },
    { ...DEFAULT_CHANNEL, _id: "alive" },
  ])

  await subscriptionCollection.insertOne({
    _id: { channelId: "alive", chatId: "chatId" },
  })

  await cleanupOrphanChannels()

  await expect(channelCollection.find().toArray()).resolves.toEqual([
    { ...DEFAULT_CHANNEL, _id: "alive", nextAttemptAt: expect.any(Date) },
  ])
})
