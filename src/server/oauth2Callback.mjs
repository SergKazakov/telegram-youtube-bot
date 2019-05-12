import url from "url"
import crypto from "crypto"

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

const decrypt = data => {
  try {
    const decipher = crypto.createDecipher("aes192", process.env.CRYPTO_SECRET)

    return decipher.update(data, "hex", "utf8") + decipher.final("utf8")
  } catch (_) {
    const error = new Error("Authentication failed")

    error.status = 401

    throw error
  }
}

const schema = yup.object().shape({
  code: yup
    .string()
    .trim()
    .required(),
  state: yup
    .string()
    .trim()
    .required(),
})

export const oauth2Callback = handleError(async (req, res) => {
  const { query } = url.parse(req.url, true)

  const { code, state } = await schema.validate(query)

  const decryptedState = decrypt(state)

  const { tokens } = await getOauth2Client().getToken(code)

  const { userId, chatId } = JSON.parse(decryptedState)

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
