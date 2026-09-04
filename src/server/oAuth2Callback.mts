import { ValidationError } from "yup"

import { bot } from "../bot/index.mts"
import { chatCollection } from "../mongodb.mts"
import { getOAuth2Client, parseSearchParams, verifyState } from "../utils.mts"

import { type RequestHandler } from "./types.mts"

export const oAuth2Callback: RequestHandler = async request => {
  const { code, state } = await parseSearchParams(
    yup =>
      yup.object({
        code: yup.string().trim().required(),
        state: yup.string().trim().required(),
      }),
    request,
  )

  const chatId = verifyState(state)

  if (!chatId) {
    throw new ValidationError("Invalid state")
  }

  const { tokens } = await getOAuth2Client().getToken(code)

  await chatCollection.updateOne(
    { _id: chatId },
    { $set: { refreshToken: tokens.refresh_token as string } },
    { upsert: true },
  )

  await bot.telegram.sendMessage(chatId, "Success")

  return Response.redirect(`https://t.me/${bot.botInfo?.username}`)
}
