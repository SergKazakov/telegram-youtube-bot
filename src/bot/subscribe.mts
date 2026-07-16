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

    yield items

    pageToken = nextPageToken
  } while (pageToken)
}

export const subscribe: MiddlewareFn<Context> = async ctx => {
  const chat = getChat(ctx)

  const channels: string[] = []

  for await (const subscriptions of getAllSubscriptions(chat.refreshToken)) {
    for (const it of subscriptions) {
      try {
        await subscribeToChannel(it.channelId)

        channels.push(it.channelId)

        await subscriptionCollection.insertOne({
          _id: { channelId: it.channelId, chatId: chat._id },
        })
      } catch {}
    }
  }

  await subscriptionCollection.deleteMany({
    ...(channels.length > 0 && { "_id.channelId": { $nin: channels } }),
    "_id.chatId": chat._id,
  })

  return ctx.reply(`You were subscribed to ${channels.length} channels`)
}
