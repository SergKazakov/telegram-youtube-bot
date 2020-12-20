import url from "url"

import yup from "yup"

import { bot } from "../bot"
import { getOauth2Client } from "../google"
import { User } from "../models/user"

const handleError = fn => async (req, res) => {
  try {
    await fn(req, res)
  } catch (error) {
    res.writeHead(
      error.name === "ValidationError" ? 400 : error.status || 500,
      {
        "Content-Type": "application/json",
      },
    )

    res.end(JSON.stringify({ message: error.message }))
  }
}

const schema = yup.object().shape({
  code: yup.string().trim().required(),
  state: yup.string().trim().required(),
})

export const oauth2Callback = handleError(async (req, res) => {
  const { query } = url.parse(req.url, true)

  const { code, state } = await schema.validate(query)

  const { tokens } = await getOauth2Client().getToken(code)

  const { userId, chatId } = JSON.parse(Buffer.from(state, "base64").toString())

  await User.updateOne(
    { userId, chatId },
    { refreshToken: tokens.refresh_token },
    { upsert: true },
  )

  await bot.telegram.sendMessage(chatId, "Success")

  const { username } = await bot.telegram.getMe()

  res.writeHead(302, { Location: `https://t.me/${username}` })

  res.end()
})
