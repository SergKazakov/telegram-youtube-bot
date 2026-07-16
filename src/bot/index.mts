import { Telegraf } from "telegraf"

import { env } from "../env.mts"

import {
  getChannelList,
  openChannel,
  unsubscribeFromChannel,
  updateChannelList,
} from "./list.mts"
import { requireAuth } from "./requireAuth.mts"
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
  .use(requireAuth)
  .command("subscribe", subscribe)
  .command("list", getChannelList)
  .action(/^unsubscribeFromChannel:(.+)$/, unsubscribeFromChannel)
  .action(/^updateChannelList:(.*)$/, updateChannelList)
  .action(/^openChannel:(.+)$/, openChannel)

export const webhook =
  new URL(env.PUBLIC_URL).protocol === "https:"
    ? await bot.createWebhook({ domain: env.PUBLIC_URL, allowed_updates: [] })
    : null

export const startBot = async () => {
  if (!webhook) {
    await bot.launch({ allowedUpdates: [] })
  }
}
