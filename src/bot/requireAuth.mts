import dayjs from "dayjs"
import { type Context, Markup, type MiddlewareFn } from "telegraf"

import { env } from "../env.mts"
import { buildAuthUrl, getOAuth2Client, signState } from "../lib/oauth.mts"
import { getYoutubeClient, isRefreshTokenValid } from "../lib/youtube.mts"
import { type AuthenticatedChatSchema, chatCollection } from "../mongodb.mts"

export const getChat = (ctx: Context): AuthenticatedChatSchema => ctx.state.chat

const replyWithAuth = (ctx: Context, chatId: string) =>
  ctx.reply(
    "Sign up",
    Markup.inlineKeyboard([
      Markup.button.url(
        "Google",
        buildAuthUrl(getOAuth2Client(), signState(chatId)),
      ),
    ]),
  )

const tokenValidityCache = new Map<string, Date>()

const isTokenValid = async (refreshToken: string) => {
  const cachedUntil = tokenValidityCache.get(refreshToken)

  if (cachedUntil && dayjs().isBefore(cachedUntil)) {
    return true
  }

  try {
    const valid = await isRefreshTokenValid(getYoutubeClient(refreshToken))

    if (valid) {
      tokenValidityCache.set(
        refreshToken,
        dayjs().add(env.MINUTES_TO_CACHE_TOKEN, "m").toDate(),
      )
    } else {
      tokenValidityCache.delete(refreshToken)
    }

    return valid
  } catch (error) {
    tokenValidityCache.delete(refreshToken)

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
