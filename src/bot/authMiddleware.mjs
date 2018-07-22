import { getOauth2Client } from "../google"

export const authMiddleware = async (ctx, next) => {
  if (ctx.state.user) {
    return next()
  }

  const url = getOauth2Client().generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.readonly"],
    state: JSON.stringify({ userId: ctx.from.id, chatId: ctx.chat.id }),
  })

  return ctx.reply(url)
}
