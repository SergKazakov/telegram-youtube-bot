import Telegraf from "telegraf"
import HttpsProxyAgent from "https-proxy-agent"
import { getUserMiddleware } from "./getUserMiddleware"
import { errorHandler } from "./errorHandler"
import { authMiddleware } from "./authMiddleware"
import { onSubscribeCommand } from "./onSubscribeCommand"
import { onSubscriptionsCommand } from "./onSubscriptionsCommand"
import { execAction } from "./actions/execAction"
import { getSubscription } from "./actions/getSubscription"

export const bot = new Telegraf(process.env.BOT_TOKEN, {
  ...(process.env.NODE_ENV !== "production" && {
    telegram: {
      agent: new HttpsProxyAgent(process.env.PROXY_URL),
    },
  }),
})

bot
  .use(getUserMiddleware)
  .use(errorHandler)
  .command("subscribe", authMiddleware, onSubscribeCommand)
  .command("subscriptions", authMiddleware, onSubscriptionsCommand)
  .action(/\/subscription (.+)/, authMiddleware, getSubscription)
  .action(/\/subscribe (.+)/, authMiddleware, execAction("subscribe"))
  .action(/\/unsubscribe (.+)/, authMiddleware, execAction("unsubscribe"))
