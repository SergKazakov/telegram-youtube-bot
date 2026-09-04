import { expect, it } from "vitest"

import { DEFAULT_CHANNEL, channelCollection } from "../mongodb.mts"
import { createChannel, createSubscriptions } from "../testUtils/index.mts"

import { cleanupOrphanChannels } from "./cleanupOrphanChannels.mts"

it("should delete orphan channels and keep subscribed ones", async () => {
  await createChannel({ _id: "orphan" })

  await createChannel({ _id: "alive" })

  await createSubscriptions([{ channelId: "alive", chatId: "chatId" }])

  await cleanupOrphanChannels()

  await expect(channelCollection.find().toArray()).resolves.toEqual([
    { ...DEFAULT_CHANNEL, _id: "alive", nextAttemptAt: expect.any(Date) },
  ])
})
