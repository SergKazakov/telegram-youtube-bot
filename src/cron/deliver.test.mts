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
} from "../testUtils/index.mts"

import { deliver } from "./deliver.mts"

beforeEach(() => {
  vi.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

  return () => vi.useRealTimers()
})

it("should keep a delivery pending after a failed retry", async () => {
  await createVideo()

  await createDelivery()

  bot.telegram.sendMessage.mockRejectedValueOnce(new Error("foo"))

  await deliver()

  await expect(
    deliveryCollection.findOne({
      _id: { chatId: "chatId", videoId: "videoId" },
    }),
  ).resolves.toMatchObject({
    status: "pending",
    attempts: 1,
    nextAttemptAt: new Date("2026-01-01T00:01:00.000Z"),
  })

  bot.telegram.sendMessage.mockRejectedValueOnce(new Error("foo"))

  await deliveryCollection.updateOne(
    { _id: { chatId: "chatId", videoId: "videoId" } },
    {
      $set: {
        attempts: env.MAX_ATTEMPTS_TO_DELIVER - 1,
        nextAttemptAt: new Date(),
      },
    },
  )

  await deliver()

  await expect(
    deliveryCollection.findOne({
      _id: { chatId: "chatId", videoId: "videoId" },
    }),
  ).resolves.toMatchObject({
    status: "failed",
    attempts: env.MAX_ATTEMPTS_TO_DELIVER,
  })
})

it("should respect Telegram retry_after", async () => {
  await createVideo()

  await createDelivery()

  bot.telegram.sendMessage.mockRejectedValueOnce(
    new TelegramError({
      description: "Too Many Requests: retry later",
      error_code: 429,
      parameters: { retry_after: 90 },
    }),
  )

  await deliver()

  const delivery = await deliveryCollection.findOne({
    _id: { chatId: "chatId", videoId: "videoId" },
  })

  expect(delivery?.nextAttemptAt).toEqual(new Date("2026-01-01T00:01:30.000Z"))
})

it("should mark a delivery as failed and delete subscriptions when blocked", async () => {
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

  await expect(
    deliveryCollection.findOne({
      _id: { chatId: "chatId", videoId: "videoId" },
    }),
  ).resolves.toMatchObject({ status: "failed" })
})

it("should mark a delivery as delivered after successful retry", async () => {
  await createVideo()

  await createDelivery()

  await deliver()

  await expect(
    deliveryCollection.findOne({
      _id: { chatId: "chatId", videoId: "videoId" },
    }),
  ).resolves.toMatchObject({ status: "delivered", attempts: 0 })
})
