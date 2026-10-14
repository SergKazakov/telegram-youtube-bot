import { type Context, type MiddlewareFn } from "telegraf"

import { getAllSubscriptions, getYoutubeClient } from "../lib/youtube.mts"
import {
  DEFAULT_CHANNEL,
  channelCollection,
  subscriptionCollection,
} from "../mongodb.mts"

import { getChat } from "./requireAuth.mts"

export const subscribe: MiddlewareFn<Context> = async ctx => {
  const chat = getChat(ctx)

  const channels: string[] = []

  const subscriptions = getAllSubscriptions(getYoutubeClient(chat.refreshToken))

  for await (const it of subscriptions) {
    channels.push(it.channelId)
  }

  if (channels.length > 0) {
    await channelCollection.bulkWrite(
      channels.map(_id => ({
        updateOne: {
          filter: { _id },
          update: { $setOnInsert: { ...DEFAULT_CHANNEL, _id } },
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
