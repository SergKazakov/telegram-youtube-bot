import * as yup from "yup"

import { bot } from "../bot/index.mjs"
import { getOAuth2Client } from "../google.mjs"
import { chatCollection } from "../mongodb.mjs"
import { parseSearchParams } from "../utils.mjs"

const schema = yup.object({
  code: yup.string().trim().required(),
  state: yup.string().trim().required(),
})

export const oAuth2Callback = async (req, res) => {
  const { code, state } = await schema.validate(parseSearchParams(req))

  const { tokens } = await getOAuth2Client().getToken(code)

  const chatId = Buffer.from(state, "base64").toString()

  await chatCollection.updateOne(
    { _id: chatId },
    { $set: { refreshToken: tokens.refresh_token } },
    { upsert: true },
  )

  await bot.telegram.sendMessage(chatId, "Success")

  res
    .writeHead(302, { Location: `https://t.me/${bot.botInfo?.username}` })
    .end()
}
