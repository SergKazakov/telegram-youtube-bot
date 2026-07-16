import { type Context, Markup, type MiddlewareFn } from "telegraf"

import {
  type AuthenticatedChatSchema,
  subscriptionCollection,
} from "../mongodb.mts"
import {
  buildChannelUrl,
  getSubscriptions,
  getYoutubeClient,
} from "../utils.mts"

import { getChat } from "./requireAuth.mts"

const buildChannelList = async ({
  chat,
  pageToken,
  fn,
}: {
  chat: AuthenticatedChatSchema
  pageToken?: string
  fn: Context["reply"] | Context["editMessageText"]
}) => {
  const { items, nextPageToken } = await getSubscriptions({
    refreshToken: chat.refreshToken,
    pageToken,
  })

  if (items.length === 0) {
    await fn("No subscriptions")

    return
  }

  const buttons = items.map(it => [
    Markup.button.callback(it.title, `openChannel:${it.channelId}`),
  ])

  if (nextPageToken) {
    buttons.push([
      Markup.button.callback("▶️", `updateChannelList:${nextPageToken}`),
    ])
  }

  await fn("Choose a channel", Markup.inlineKeyboard(buttons))
}

export const getChannelList: MiddlewareFn<Context> = async ctx => {
  await buildChannelList({ chat: getChat(ctx), fn: ctx.reply.bind(ctx) })
}

type ActionHandler = MiddlewareFn<Context & { match: RegExpExecArray }>

export const updateChannelList: ActionHandler = async ctx => {
  await ctx.answerCbQuery()

  await buildChannelList({
    chat: getChat(ctx),
    pageToken: ctx.match[1],
    fn: ctx.editMessageText.bind(ctx),
  })
}

export const unsubscribeFromChannel: ActionHandler = async ctx => {
  await ctx.answerCbQuery()

  const chat = getChat(ctx)

  const channelId = ctx.match[1]

  const youtubeClient = getYoutubeClient(chat.refreshToken)

  const {
    data: { items },
  } = await youtubeClient.subscriptions.list({
    forChannelId: channelId,
    mine: true,
    part: ["id"],
  })

  const id = items?.[0]?.id

  if (id) {
    await youtubeClient.subscriptions.delete({ id })
  }

  await subscriptionCollection.deleteOne({
    _id: { channelId, chatId: chat._id },
  })

  await buildChannelList({ chat, fn: ctx.editMessageText.bind(ctx) })
}

export const openChannel: ActionHandler = async ctx => {
  await ctx.answerCbQuery()

  const channelId = ctx.match[1]

  await ctx.editMessageText(
    `<a href="${buildChannelUrl(channelId)}">Open channel</a>`,
    {
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "❌ Unsubscribe",
            `unsubscribeFromChannel:${channelId}`,
          ),
        ],
        [Markup.button.callback("⬅️ Back", "updateChannelList:")],
      ]),
      parse_mode: "HTML",
    },
  )
}
