import { bot } from "../bot/index.mts"
import { chatCollection } from "../mongodb.mts"
import { getOAuth2Client, parseSearchParams } from "../utils.mts"

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

  const { tokens } = await getOAuth2Client().getToken(code)

  const chatId = Buffer.from(state, "base64").toString()

  await chatCollection.updateOne(
    { _id: chatId },
    { $set: { refreshToken: tokens.refresh_token as string } },
    { upsert: true },
  )

  await bot.telegram.sendMessage(chatId, "Success")

  return Response.redirect(`https://t.me/${bot.botInfo?.username}`)
}
