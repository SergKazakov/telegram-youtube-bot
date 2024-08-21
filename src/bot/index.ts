import { Telegraf } from "telegraf"

import { subscribe } from "./subscribe.ts"

export const bot = new Telegraf(process.env.BOT_TOKEN as string)
  .use(async (ctx, next) => {
    try {
      await next()
    } catch (error) {
      console.error(error)

      return ctx.reply("Ooops")
    }
  })
  .command("subscribe", subscribe)
