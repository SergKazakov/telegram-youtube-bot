import { type youtube_v3 as youtubeV3 } from "@googleapis/youtube"
import { type Context, type MiddlewareFn } from "telegraf"

import { channelCollection, subscriptionCollection } from "../mongodb.mts"
import { getSubscriptions } from "../utils.mts"

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
    channels.push(it.channelId)
  }

  if (channels.length > 0) {
    const nextAttemptAt = new Date(0)

    await channelCollection.bulkWrite(
      channels.map(_id => ({
        updateOne: {
          filter: { _id },
          update: {
            $setOnInsert: {
              _id,
              nextAttemptAt,
              lastRequestedAt: null,
              lastConfirmedAt: null,
              lockedAt: null,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    )

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

  return ctx.reply(`Queued ${channels.length} channels for subscription`)
}
