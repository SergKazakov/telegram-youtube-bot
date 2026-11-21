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
  // eslint-disable-next-line unicorn/prefer-await, unicorn/prefer-top-level-await
  .catch(error => console.error(Error.isError(error) ? error.message : error))
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

export const startBot = () => bot.launch({ allowedUpdates: [] })
