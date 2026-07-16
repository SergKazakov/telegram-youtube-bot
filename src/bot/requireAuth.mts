import { GaxiosError } from "gaxios"
import { type Context, Markup, type MiddlewareFn } from "telegraf"

import { type AuthenticatedChatSchema, chatCollection } from "../mongodb.mts"
import { getOAuth2Client, getYoutubeClient } from "../utils.mts"

export const getChat = (ctx: Context) =>
  ctx.state.chat as AuthenticatedChatSchema

const replyWithAuth = (ctx: Context, chatId: string) =>
  ctx.reply(
    "Sign up",
    Markup.inlineKeyboard([
      Markup.button.url(
        "Google",
        getOAuth2Client().generateAuthUrl({
          access_type: "offline",
          prompt: "consent",
          scope: ["https://www.googleapis.com/auth/youtube"],
          state: Buffer.from(chatId).toString("base64"),
        }),
      ),
    ]),
  )

const isTokenValid = async (refreshToken: string) => {
  try {
    await getYoutubeClient(refreshToken).channels.list({
      mine: true,
      maxResults: 1,
      part: ["id"],
    })

    return true
  } catch (error) {
    if (
      error instanceof GaxiosError
      && error.response?.data?.error === "invalid_grant"
    ) {
      return false
    }

    throw error
  }
}

export const requireAuth: MiddlewareFn<Context> = async (ctx, next) => {
  const chatId = String(ctx.chat?.id)

  const chat = await chatCollection.findOne({ _id: chatId })

  if (!chat?.refreshToken) {
    return replyWithAuth(ctx, chatId)
  }

  if (!(await isTokenValid(chat.refreshToken))) {
    await chatCollection.updateOne(
      { _id: chat._id },
      { $set: { refreshToken: null } },
    )

    return replyWithAuth(ctx, chatId)
  }

  ctx.state.chat = chat

  return next()
}
