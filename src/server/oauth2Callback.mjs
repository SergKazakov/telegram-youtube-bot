import url from "url"
import crypto from "crypto"

import yup from "yup"
import { bot } from "../bot"
import { getOauth2Client } from "../google"
import { User } from "../models/user"

const handleError = fn => async (req, res) => {
  try {
    await fn(req, res)
  } catch ({ name, status = 500, message }) {
    res.writeHead(name === "ValidationError" ? 400 : status, {
      "Content-Type": "application/json",
    })

    res.end(JSON.stringify({ message }))
  }
}

const decrypt = data =>
  new Promise((resolve, reject) => {
    try {
      const decipher = crypto.createDecipher(
        "aes192",
        process.env.CRYPTO_SECRET,
      )

      resolve(decipher.update(data, "hex", "utf8") + decipher.final("utf8"))
    } catch (err) {
      const error = new Error("Authentication failed")

      error.status = 401

      reject(error)
    }
  })

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

  const decryptedState = await decrypt(state)

  const { tokens } = await getOauth2Client().getToken(code)

  const { userId, chatId } = JSON.parse(decryptedState)

  await User.update(
    { userId, chatId },
    { refreshToken: tokens.refresh_token },
    { upsert: true },
  )

  await bot.telegram.sendMessage(chatId, "Success")

  const { username } = await bot.telegram.getMe()

  res.writeHead(302, { Location: `https://t.me/${username}` })

  res.end()
})
