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

it("should fail when the video is not found", async () => {
  await createDelivery()

  await deliver()

  await expect(
    deliveryCollection.findOne({
      _id: { chatId: "chatId", videoId: "videoId" },
    }),
  ).resolves.toMatchObject({ lockedAt: null, status: "failed" })
})

it("should keep a delivery pending after a failed attempt", async () => {
  await createVideo()

  await createDelivery()

  bot.telegram.sendMessage.mockRejectedValueOnce(new Error("foo"))

  await deliver()

  await expect(
    deliveryCollection.findOne({
      _id: { chatId: "chatId", videoId: "videoId" },
    }),
  ).resolves.toMatchObject({
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

  await expect(
    deliveryCollection.findOne({
      _id: { chatId: "chatId", videoId: "videoId" },
    }),
  ).resolves.toMatchObject({
    lockedAt: null,
    status: "failed",
    attempts: env.MAX_ATTEMPTS_TO_DELIVER,
  })
})

it("should respect Telegram's retry_after", async () => {
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

  await expect(
    deliveryCollection.findOne({
      _id: { chatId: "chatId", videoId: "videoId" },
    }),
  ).resolves.toMatchObject({ lockedAt: null, status: "failed" })
})

it("should deliver", async () => {
  await createVideo()

  await createDelivery()

  await deliver()

  await expect(
    deliveryCollection.findOne({
      _id: { chatId: "chatId", videoId: "videoId" },
    }),
  ).resolves.toMatchObject({ lockedAt: null, status: "delivered" })
})
