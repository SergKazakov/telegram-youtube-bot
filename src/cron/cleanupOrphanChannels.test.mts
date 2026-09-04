import { expect, it } from "vitest"

import { channelCollection, subscriptionCollection } from "../mongodb.mts"

import { cleanupOrphanChannels } from "./cleanupOrphanChannels.mts"

it("should delete orphan channels and keep subscribed ones", async () => {
  await channelCollection.insertMany([
    {
      _id: "orphan",
      nextAttemptAt: new Date(),
      lastRequestedAt: null,
      lastConfirmedAt: null,
      lockedAt: null,
    },
    {
      _id: "alive",
      nextAttemptAt: new Date(),
      lastRequestedAt: null,
      lastConfirmedAt: null,
      lockedAt: null,
    },
  ])

  await subscriptionCollection.insertOne({
    _id: { channelId: "alive", chatId: "chatId" },
  })

  await cleanupOrphanChannels()

  await expect(channelCollection.find().toArray()).resolves.toEqual([
    {
      _id: "alive",
      nextAttemptAt: expect.any(Date),
      lastRequestedAt: null,
      lastConfirmedAt: null,
      lockedAt: null,
    },
  ])
})
