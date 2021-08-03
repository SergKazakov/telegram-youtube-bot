import { Telegraf } from "telegraf"

import { getUserMiddleware } from "./getUserMiddleware"
import { errorHandler } from "./errorHandler"
import { authMiddleware } from "./authMiddleware"
import { onSubscribeCommand } from "./onSubscribeCommand"

export const bot = new Telegraf(process.env.BOT_TOKEN)

bot
  .use(getUserMiddleware)
  .use(errorHandler)
  .command("subscribe", authMiddleware, onSubscribeCommand)
