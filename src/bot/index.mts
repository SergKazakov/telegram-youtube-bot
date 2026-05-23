import { Telegraf } from "telegraf"

import { env } from "../env.mts"

import { subscribe } from "./subscribe.mts"

export const bot = new Telegraf(env.BOT_TOKEN)
  .use(async (ctx, next) => {
    try {
      await next()
    } catch (error) {
      console.error(error)

      return ctx.reply("Ooops")
    }
  })
  .command("subscribe", subscribe)

export const webhook =
  new URL(env.PUBLIC_URL).protocol === "https:"
    ? await bot.createWebhook({ domain: env.PUBLIC_URL, allowed_updates: [] })
    : null
