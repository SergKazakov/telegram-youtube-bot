import { ValidationError } from "yup"

import { bot } from "../bot/index.mts"
import { parseSearchParams } from "../lib/http.mts"
import {
  exchangeCodeForRefreshToken,
  getOAuth2Client,
  verifyState,
} from "../lib/oauth.mts"
import { chatCollection } from "../mongodb.mts"
import { schemaToHandleOAuth2Callback } from "../schemas.mts"

import { type RequestHandler } from "./types.mts"

export const oAuth2Callback: RequestHandler = async request => {
  const { code, state } = await parseSearchParams(
    schemaToHandleOAuth2Callback,
    request,
  )

  const chatId = verifyState(state)

  if (!chatId) {
    throw new ValidationError("Invalid state")
  }

  const refreshToken = await exchangeCodeForRefreshToken(
    getOAuth2Client(),
    code,
  )

  if (!refreshToken) {
    throw new ValidationError("Missing refresh token")
  }

  await chatCollection.updateOne(
    { _id: chatId },
    { $set: { refreshToken } },
    { upsert: true },
  )

  await bot.telegram.sendMessage(chatId, "Success")

  return Response.redirect(`https://t.me/${bot.botInfo?.username}`)
}
