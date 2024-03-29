import { Telegraf } from "telegraf"

import { subscribe } from "./subscribe.mjs"

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

export const webhook = await bot.createWebhook({
  domain: process.env.PUBLIC_URL as string,
  allowed_updates: [],
})
