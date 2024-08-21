import { type ServerResponse } from "node:http"

import * as yup from "yup"

import { bot } from "../bot/index.ts"
import { chatCollection } from "../mongodb.ts"
import { getOAuth2Client, parseSearchParams } from "../utils.ts"

export const oAuth2Callback = async (res: ServerResponse) => {
  const { code, state } = await parseSearchParams(
    yup.object({
      code: yup.string().trim().required(),
      state: yup.string().trim().required(),
    }),
    res.req,
  )

  const { tokens } = await getOAuth2Client().getToken(code)

  const chatId = Buffer.from(state, "base64").toString()

  await chatCollection.updateOne(
    { _id: chatId },
    { $set: { refreshToken: tokens.refresh_token as string } },
    { upsert: true },
  )

  await bot.telegram.sendMessage(chatId, "Success")

  res
    .writeHead(302, { Location: `https://t.me/${bot.botInfo?.username}` })
    .end()
}
