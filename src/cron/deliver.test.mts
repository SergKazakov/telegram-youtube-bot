import { TelegramError } from "telegraf"
import { beforeEach, expect, it, vi } from "vitest"

import { bot } from "../bot/__mocks__/index.mts"
import { env } from "../env.mts"
import {
  chatCollection,
  deliveryCollection,
  subscriptionCollection,
} from "../mongodb.mts"
import {
  createChatSubscription,
  createDelivery,
  createVideo,
  expectDelivery,
} from "../testUtils/index.mts"

import { deliver } from "./deliver.mts"

beforeEach(() => {
  vi.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

  return () => vi.useRealTimers()
})

it("should fail when the video is not found", async () => {
  await createDelivery()

  await deliver()

  await expectDelivery({ lockedAt: null, status: "failed" })
})

it("should keep a delivery pending after a failed attempt", async () => {
  await createVideo()

  await createDelivery()

  bot.telegram.sendMessage.mockRejectedValueOnce(new Error("foo"))

  await deliver()

  await expectDelivery({
    nextAttemptAt: new Date("2026-01-01T00:01:00.000Z"),
    lockedAt: null,
    status: "pending",
    attempts: 1,
  })

  bot.telegram.sendMessage.mockRejectedValueOnce(new Error("foo"))

  await deliveryCollection.updateOne(
    { _id: { chatId: "chatId", videoId: "videoId" } },
    {
      $set: {
        nextAttemptAt: new Date(),
        attempts: env.MAX_ATTEMPTS_TO_DELIVER - 1,
      },
    },
  )

  await deliver()

  await expectDelivery({
    lockedAt: null,
    status: "failed",
    attempts: env.MAX_ATTEMPTS_TO_DELIVER,
  })
})

it("should not send the rest after a 429", async () => {
  await createVideo()

  await createDelivery()

  await createDelivery({ _id: { chatId: "chatId2", videoId: "videoId" } })

  bot.telegram.sendMessage.mockRejectedValueOnce(
    new TelegramError({
      error_code: 429,
      description: "Too Many Requests: retry later",
      parameters: { retry_after: 90 },
    }),
  )

  await deliver()

  expect(bot.telegram.sendMessage).toHaveBeenCalledTimes(1)

  await expect(deliveryCollection.find().toArray()).resolves.toEqual(
    Array.from({ length: 2 }, () => ({
      _id: expect.any(Object),
      createdAt: expect.any(Date),
      nextAttemptAt: new Date("2026-01-01T00:01:30.000Z"),
      lockedAt: null,
      status: "pending",
      attempts: 0,
    })),
  )
})

it("should fail and delete subscriptions when the bot is blocked", async () => {
  await createVideo()

  await createDelivery()

  await createChatSubscription()

  bot.telegram.sendMessage.mockRejectedValueOnce(
    new TelegramError({
      description: "Forbidden: bot was blocked by the user",
      error_code: 403,
    }),
  )

  await deliver()

  await expect(chatCollection.findOne({ _id: "chatId" })).resolves.toBeNull()

  await expect(
    subscriptionCollection.findOne({
      _id: { channelId: "channelId", chatId: "chatId" },
    }),
  ).resolves.toBeNull()

  await expectDelivery({ lockedAt: null, status: "failed" })
})

it("should send a photo when the video has a thumbnail", async () => {
  await createVideo({ thumbnail: "foo" })

  await createDelivery()

  await deliver()

  await expectDelivery({ lockedAt: null, status: "delivered" })

  expect(bot.telegram.sendPhoto).toHaveBeenCalledTimes(1)

  expect(bot.telegram.sendMessage).not.toHaveBeenCalled()
})

it("should send a message when the video has no thumbnail", async () => {
  await createVideo()

  await createDelivery()

  await deliver()

  await expectDelivery({ lockedAt: null, status: "delivered" })

  expect(bot.telegram.sendPhoto).not.toHaveBeenCalled()

  expect(bot.telegram.sendMessage).toHaveBeenCalledTimes(1)
})
