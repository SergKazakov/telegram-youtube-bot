import Markup from "telegraf/markup"

import { getOauth2Client } from "../google"

export const authMiddleware = async (ctx, next) => {
  if (ctx.state.user) {
    return next()
  }

  const url = getOauth2Client().generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.readonly"],
    state: Buffer.from(
      JSON.stringify({ userId: ctx.from.id, chatId: ctx.chat.id }),
    ).toString("base64"),
  })

  return ctx.reply(
    "Sign up",
    Markup.inlineKeyboard([Markup.urlButton("Google", url)]).extra(),
  )
}
