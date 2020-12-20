import mongoose from "mongoose"
import terminus from "@godaddy/terminus"
import Redis from "ioredis"

import { bot } from "./bot"
import { emitEvent } from "./pubsub"
import { redis } from "./redis"
import { server } from "./server"
import { handleError } from "./utils/handleError"
;(async () => {
  await redis.connect()

  redis.on("ready", () => redis.config("SET", "notify-keyspace-events", "KEA"))

  const subscriber = new Redis(process.env.REDIS_URL)

  await subscriber.subscribe("__keyevent@0__:expired")

  subscriber.on(
    "message",
    handleError(async (_, message) => {
      if (message.startsWith("channel_id")) {
        const [, channelId] = message.split(":")

        await emitEvent("subscribe")(channelId)
      }
    }),
  )

  const {
    models: { User },
  } = await mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true })

  if (process.env.NODE_ENV === "production") {
    const webhookUrl = `${process.env.PUBLIC_URL}/bot-webhook`

    const { url: currentWebhookUrl } = await bot.telegram.getWebhookInfo()

    if (currentWebhookUrl !== webhookUrl) {
      await bot.telegram.deleteWebhook()

      await bot.telegram.setWebhook(webhookUrl)
    }
  } else {
    await bot.launch()
  }

  terminus.createTerminus(server, {
    healthChecks: {
      "/healthcheck": async () => {
        if (redis.status !== "ready") {
          throw new Error("Redis is not ready")
        }

        await User.findOne()
      },
    },
    signals: ["SIGINT", "SIGTERM"],
    onSignal: () =>
      Promise.all([
        redis.quit().catch(console.log),
        subscriber.quit().catch(console.log),
        mongoose.disconnect().catch(console.log),
      ]),
    logger: console.log,
  })

  server.listen(process.env.PORT, () =>
    console.log(`Listening on ${process.env.PORT}`),
  )
})().catch(console.log)
