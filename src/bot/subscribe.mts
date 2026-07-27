import { type youtube_v3 as youtubeV3 } from "@googleapis/youtube"
import { type Context, type MiddlewareFn } from "telegraf"

import { subscriptionCollection } from "../mongodb.mts"
import { getSubscriptions, subscribeToChannel } from "../utils.mts"

import { getChat } from "./requireAuth.mts"

async function* getAllSubscriptions(refreshToken: string) {
  let pageToken: youtubeV3.Schema$SubscriptionListResponse["nextPageToken"]

  do {
    const { items, nextPageToken } = await getSubscriptions({
      ...(pageToken && { pageToken }),
      refreshToken,
    })

    yield* items

    pageToken = nextPageToken
  } while (pageToken)
}

export const subscribe: MiddlewareFn<Context> = async ctx => {
  const chat = getChat(ctx)

  const channels: string[] = []

  for await (const it of getAllSubscriptions(chat.refreshToken)) {
    try {
      await subscribeToChannel(it.channelId)

      channels.push(it.channelId)
    } catch (error) {
      console.error(
        `Failed to subscribe to ${it.channelId}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  if (channels.length > 0) {
    await subscriptionCollection.bulkWrite(
      channels.map(channelId => ({
        updateOne: {
          filter: { _id: { channelId, chatId: chat._id } },
          update: { $setOnInsert: { _id: { channelId, chatId: chat._id } } },
          upsert: true,
        },
      })),
      { ordered: false },
    )
  }

  await subscriptionCollection.deleteMany({
    ...(channels.length > 0 && { "_id.channelId": { $nin: channels } }),
    "_id.chatId": chat._id,
  })

  return ctx.reply(`You were subscribed to ${channels.length} channels`)
}
