import crypto from "crypto"

import { getOauth2Client } from "../google"

export const authMiddleware = async (ctx, next) => {
  if (ctx.state.user) {
    return next()
  }

  const cipher = crypto.createCipher("aes192", process.env.CRYPTO_SECRET)

  const state =
    cipher.update(
      JSON.stringify({ userId: ctx.from.id, chatId: ctx.chat.id }),
      "utf8",
      "hex",
    ) + cipher.final("hex")

  const url = getOauth2Client().generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.readonly"],
    state,
  })

  return ctx.reply(url)
}
