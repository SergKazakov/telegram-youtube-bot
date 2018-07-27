import crypto from "crypto"

import yup from "yup"
import httpError from "http-errors"
import { bot } from "../bot"
import { getOauth2Client } from "../google"
import { User } from "../models/user"

const handleError = fn => (req, res, next) => fn(req, res, next).catch(next)

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
  const { code, state } = await schema.validate(req.query)

  const decipher = crypto.createDecipher("aes192", process.env.CRYPTO_SECRET)

  let decryptedState = null

  try {
    decryptedState =
      decipher.update(state, "hex", "utf8") + decipher.final("utf8")
  } catch (err) {
    throw httpError(401, "Authentication failed")
  }

  const { tokens } = await getOauth2Client().getToken(code)

  const { userId, chatId } = JSON.parse(decryptedState)

  const user = await User.findOne({ userId })

  if (!user) {
    await User.create({
      userId,
      chatId,
      refreshToken: tokens.refresh_token,
    })
  }

  await bot.telegram.sendMessage(chatId, "Success login")

  const { username } = await bot.telegram.getMe()

  res.redirect(`https://t.me/${username}`)
})
