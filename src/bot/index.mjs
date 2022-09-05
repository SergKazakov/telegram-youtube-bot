import { Telegraf } from "telegraf"

import { getUserMiddleware } from "./getUserMiddleware.mjs"
import { errorHandler } from "./errorHandler.mjs"
import { authMiddleware } from "./authMiddleware.mjs"
import { onSubscribeCommand } from "./onSubscribeCommand.mjs"

export const bot = new Telegraf(process.env.BOT_TOKEN)

bot
  .use(getUserMiddleware)
  .use(errorHandler)
  .command("subscribe", authMiddleware, onSubscribeCommand)
