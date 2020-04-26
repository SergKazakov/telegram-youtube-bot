import url from "url"
import http from "http"

import { bot } from "../bot"
import { getOauth2Client } from "../google"
import { User } from "../models/user"

const handleError = (
  fn: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>,
) => async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> => {
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

class AuthenticationError extends Error {
  constructor(public status: number = 401) {
    super("Authentication failed")
  }
}

export const oauth2Callback = handleError(async (req, res) => {
  const { query } = url.parse(req.url as string, true)

  if (!query.code || !query.state) {
    throw new AuthenticationError()
  }

  const { tokens } = await getOauth2Client().getToken(query.code)

  const { userId, chatId } = JSON.parse(
    Buffer.from(query.state, "base64").toString(),
  )

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
