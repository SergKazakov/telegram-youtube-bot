import { Markup } from "telegraf"

import { getOauth2Client, getYoutubeClient } from "../google.mjs"
import { chatCollection, subscriptionCollection } from "../mongodb.mjs"
import { subscribeToChannel } from "../pubsub/index.mjs"

async function* getSubscriptions(refreshToken) {
  const youtubeClient = getYoutubeClient(refreshToken)

  let pageToken

  do {
    const {
      data: { items, nextPageToken },
    } = await youtubeClient.subscriptions.list({
      ...(pageToken && { pageToken }),
      mine: true,
      maxResults: 50,
      part: "snippet",
    })

    yield items

    pageToken = nextPageToken
  } while (pageToken)
}

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

  const channels = []

  for await (const items of getSubscriptions(chat.refreshToken)) {
    for (const {
      snippet: {
        resourceId: { channelId },
      },
    } of items) {
      channels.push(channelId)

      try {
        await subscribeToChannel(channelId)

        await subscriptionCollection.insertOne({ _id: { channelId, chatId } })
      } catch {}
    }
  }

  if (channels.length > 0) {
    await subscriptionCollection.deleteMany({
      "_id.channelId": { $nin: channels },
      "_id.chatId": chatId,
    })
  }

  return ctx.reply(`You were subscribed to ${channels.length} channels`)
}
