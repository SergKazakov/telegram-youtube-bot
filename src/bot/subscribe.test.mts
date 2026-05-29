import {
  GaxiosError,
  type GaxiosOptionsPrepared,
  type GaxiosResponse,
} from "gaxios"
import { Context, Telegram } from "telegraf"
import { expect, it, vi } from "vitest"

import {
  getOAuth2Client,
  getYoutubeClient,
  subscribeToChannel,
} from "../__mocks__/utils.mts"
import { chatCollection, subscriptionCollection } from "../mongodb.mts"
import {
  createChat,
  createChatSubscription,
  createSubscriptions,
} from "../testUtils/index.mts"

import { subscribe } from "./subscribe.mts"

const createContext = () => {
  const ctx = new Context<Context["update"]>(
    {
      update_id: 0,
      message: {
        message_id: 0,
        date: 0,
        chat: { id: 0, type: "private", first_name: "" },
        from: { id: 0, is_bot: false, first_name: "" },
        text: "/subscribe",
        entities: [{ offset: 0, length: 0, type: "bot_command" }],
      },
    },
    new Telegram(""),
    {
      id: 0,
      is_bot: true,
      first_name: "",
      username: "",
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
    },
  )

  ctx.reply = vi.fn()

  return ctx
}

it("should ask to sign in when there is no refresh token", async () => {
  getOAuth2Client.mockReturnValue({
    generateAuthUrl: vi.fn().mockReturnValue(""),
  })

  const ctx = createContext()

  await subscribe(ctx, vi.fn())

  expect(ctx.reply).toHaveBeenCalledWith("Sign up", expect.anything())
})

it("should reset refresh token when google returns invalid_grant", async () => {
  getOAuth2Client.mockReturnValue({
    generateAuthUrl: vi.fn().mockReturnValue(""),
  })

  await createChat({ _id: "0" })

  getYoutubeClient.mockReturnValue({
    subscriptions: {
      list: vi
        .fn()
        .mockRejectedValue(
          new GaxiosError(
            "invalid_grant",
            { responseType: "json" } as GaxiosOptionsPrepared,
            {
              bodyUsed: true,
              config: { responseType: "json" } as GaxiosOptionsPrepared,
              data: { error: "invalid_grant" },
            } as GaxiosResponse,
          ),
        ),
    },
  })

  const ctx = createContext()

  await subscribe(ctx, vi.fn())

  expect(ctx.reply).toHaveBeenCalledWith("Sign up", expect.anything())

  await expect(
    chatCollection.findOne({ _id: "0", refreshToken: null }),
  ).resolves.not.toBeNull()
})

it("should delete stale subscriptions when youtube subscriptions are empty", async () => {
  await createChatSubscription({ _id: "0" }, { channelId: "0", chatId: "0" })

  getYoutubeClient.mockReturnValue({
    subscriptions: {
      list: vi
        .fn()
        .mockResolvedValue({ data: { items: [], nextPageToken: undefined } }),
    },
  })

  const ctx = createContext()

  await subscribe(ctx, vi.fn())

  expect(ctx.reply).toHaveBeenCalledWith("You were subscribed to 0 channels")

  await expect(subscriptionCollection.findOne()).resolves.toBeNull()
})

it("should subscribe to channels and delete stale subscriptions", async () => {
  await createChat({ _id: "0" })

  await createSubscriptions([
    { channelId: "0", chatId: "0" },
    { channelId: "1", chatId: "0" },
    { channelId: "0", chatId: "1" },
  ])

  getYoutubeClient.mockReturnValue({
    subscriptions: {
      list: vi
        .fn()
        .mockResolvedValue({
          data: {
            items: [
              { snippet: { resourceId: { channelId: "1" } } },
              { snippet: { resourceId: { channelId: "2" } } },
            ],
            nextPageToken: undefined,
          },
        }),
    },
  })

  const ctx = createContext()

  await subscribe(ctx, vi.fn())

  expect(subscribeToChannel).toHaveBeenCalledWith("2")

  expect(ctx.reply).toHaveBeenCalledWith("You were subscribed to 2 channels")

  await expect(
    subscriptionCollection
      .find()
      .sort({ "_id.chatId": 1, "_id.channelId": 1 })
      .toArray(),
  ).resolves.toEqual([
    { _id: { channelId: "1", chatId: "0" } },
    { _id: { channelId: "2", chatId: "0" } },
    { _id: { channelId: "0", chatId: "1" } },
  ])
})
