import { TelegramError } from "telegraf"
import { expect, it } from "vitest"

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
    nextAttemptAt: expect.any(Date),
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

  expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
    "chatId",
    '<a href="https://www.youtube.com/watch?v=videoId">name – title</a>',
    { parse_mode: "HTML" },
  )

  await expect(
    deliveryCollection.findOne({
      _id: { chatId: "chatId", videoId: "videoId" },
    }),
  ).resolves.toMatchObject({ status: "delivered", attempts: 0 })
})
