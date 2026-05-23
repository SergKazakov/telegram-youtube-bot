import { type youtube_v3 as youtubeV3 } from "@googleapis/youtube"
import { GaxiosError } from "gaxios"
import { type Context, Markup, type MiddlewareFn } from "telegraf"

import { chatCollection, subscriptionCollection } from "../mongodb.mts"
import {
  getOAuth2Client,
  getYoutubeClient,
  subscribeToChannel,
} from "../utils.mts"

async function* getSubscriptions(refreshToken: string) {
  const youtubeClient = getYoutubeClient(refreshToken)

  let pageToken: youtubeV3.Schema$SubscriptionListResponse["nextPageToken"]

  do {
    const {
      data: { items, nextPageToken },
    } = await youtubeClient.subscriptions.list({
      ...(pageToken && { pageToken }),
      mine: true,
      maxResults: 50,
      part: ["snippet"],
    })

    yield items ?? []

    pageToken = nextPageToken
  } while (pageToken)
}

const replyWithAuth = (ctx: Context, chatId: string) =>
  ctx.reply(
    "Sign up",
    Markup.inlineKeyboard([
      Markup.button.url(
        "Google",
        getOAuth2Client().generateAuthUrl({
          access_type: "offline",
          prompt: "consent",
          scope: ["https://www.googleapis.com/auth/youtube.readonly"],
          state: Buffer.from(chatId).toString("base64"),
        }),
      ),
    ]),
  )

export const subscribe: MiddlewareFn<Context> = async ctx => {
  const chatId = String(ctx.chat?.id)

  const chat = await chatCollection.findOne({ _id: chatId })

  if (!chat?.refreshToken) {
    return replyWithAuth(ctx, chatId)
  }

  const channels: string[] = []

  try {
    for await (const subscriptions of getSubscriptions(chat.refreshToken)) {
      for (const subscription of subscriptions) {
        const channelId = subscription.snippet?.resourceId?.channelId

        if (!channelId) {
          continue
        }

        try {
          await subscribeToChannel(channelId)

          channels.push(channelId)

          await subscriptionCollection.insertOne({ _id: { channelId, chatId } })
        } catch {}
      }
    }
  } catch (error) {
    if (
      error instanceof GaxiosError
      && error.response?.data?.error === "invalid_grant"
    ) {
      await chatCollection.updateOne(
        { _id: chatId },
        { $set: { refreshToken: null } },
      )

      return replyWithAuth(ctx, chatId)
    }

    throw error
  }

  await subscriptionCollection.deleteMany({
    ...(channels.length > 0 && { "_id.channelId": { $nin: channels } }),
    "_id.chatId": chatId,
  })

  return ctx.reply(`You were subscribed to ${channels.length} channels`)
}
