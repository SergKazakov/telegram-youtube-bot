import * as yup from "yup"

import { bot } from "../bot/index.mjs"
import { getOauth2Client } from "../google.mjs"
import { chatCollection } from "../mongodb.mjs"

const schema = yup.object().shape({
  code: yup.string().trim().required(),
  state: yup.string().trim().required(),
})

export const oauth2Callback = async (req, res) => {
  try {
    const { searchParams } = new URL(req.url, process.env.PUBLIC_URL)

    const { code, state } = await schema.validate(
      Object.fromEntries(searchParams),
    )

    const { tokens } = await getOauth2Client().getToken(code)

    const chatId = Buffer.from(state, "base64").toString()

    await chatCollection.updateOne(
      { _id: chatId },
      { $set: { refreshToken: tokens.refresh_token } },
      { upsert: true },
    )

    await bot.telegram.sendMessage(chatId, "Success")

    const { username } = await bot.telegram.getMe()

    res.writeHead(302, { Location: `https://t.me/${username}` }).end()
  } catch (error) {
    res
      .writeHead(error instanceof yup.ValidationError ? 400 : 500, {
        "Content-Type": "application/json",
      })
      .end(JSON.stringify({ message: error.message }))
  }
}
