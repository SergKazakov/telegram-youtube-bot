import { Markup } from "telegraf"

import { getOauth2Client, getYoutubeClient } from "../google.mjs"
import { chatCollection, subscriptionCollection } from "../mongodb.mjs"
import { emitEvent } from "../pubsub/index.mjs"

export const subscribe = async ctx => {
  const chatId = String(ctx.chat.id)

  const chat = await chatCollection.findOne({ _id: chatId })

  if (!chat?.refreshToken) {
    const url = getOauth2Client().generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/youtube.readonly"],
      state: Buffer.from(chatId).toString("base64"),
    })

    return ctx.reply(
      "Sign up",
      Markup.inlineKeyboard([Markup.button.url("Google", url)]),
    )
  }

  const youtube = getYoutubeClient(chat.refreshToken)

  const channels = []

  let nextPageToken

  do {
    const { data } = await youtube.subscriptions.list({
      mine: true,
      maxResults: 50,
      part: "snippet",
      ...(nextPageToken && { pageToken: nextPageToken }),
    })

    for (const {
      snippet: {
        resourceId: { channelId },
      },
    } of data.items) {
      channels.push(channelId)

      try {
        await emitEvent("subscribe")(channelId)

        await subscriptionCollection.insertOne({ _id: { channelId, chatId } })
      } catch {}
    }

    nextPageToken = data.nextPageToken
  } while (nextPageToken)

  if (channels.length > 0) {
    await subscriptionCollection.deleteMany({
      "_id.channelId": { $nin: channels },
      "_id.chatId": chatId,
    })
  }

  return ctx.reply(`You were subscribed to ${channels.length} channels`)
}
