import dayjs from "dayjs"
import { expect, it } from "vitest"

import { subscribeToChannel } from "../__mocks__/utils.mts"
import { channelCollection } from "../mongodb.mts"
import { createChannel } from "../testUtils/index.mts"

import { subscribeToChannels } from "./subscribeToChannels.mts"

it("should not resubscribe to recent channels", async () => {
  await createChannel({ nextAttemptAt: dayjs().add(2, "h").toDate() })

  await subscribeToChannels()

  expect(subscribeToChannel).not.toHaveBeenCalled()
})

it("should skip channels with a fresh lock", async () => {
  await createChannel({ _id: "locked", lockedAt: new Date() })

  await createChannel({ _id: "free" })

  await subscribeToChannels()

  expect(subscribeToChannel).toHaveBeenCalledTimes(1)

  expect(subscribeToChannel).toHaveBeenCalledWith("free")
})

it("should retry channels with a stale lock", async () => {
  await createChannel({ lockedAt: dayjs().subtract(1, "d").toDate() })

  await subscribeToChannels()

  expect(subscribeToChannel).toHaveBeenCalledWith("channelId")
})

it("should release the lock and retry on failure", async () => {
  await createChannel()

  subscribeToChannel.mockRejectedValueOnce(new Error("foo"))

  await subscribeToChannels()

  const record = await channelCollection.findOne({ _id: "channelId" })

  expect(record).toMatchObject({ lastRequestedAt: null, lockedAt: null })

  expect(record?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now())
})

it("should subscribe to new channels", async () => {
  await createChannel()

  await subscribeToChannels()

  expect(subscribeToChannel).toHaveBeenCalledWith("channelId")

  const record = await channelCollection.findOne({ _id: "channelId" })

  expect(record).toMatchObject({
    lastRequestedAt: expect.any(Date),
    lockedAt: null,
  })

  expect(record?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now())
})
