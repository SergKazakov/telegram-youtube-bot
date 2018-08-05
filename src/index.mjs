import util from "util"

import mongoose from "mongoose"
import terminus from "@godaddy/terminus"
import { redis } from "./redis"
import { bot } from "./bot"
import { server } from "./server"
;(async () => {
  await redis.connect()

  const {
    models: { User },
  } = await mongoose.connect(
    process.env.MONGODB_URL,
    { useNewUrlParser: true },
  )

  const webhookUrl = `${process.env.PUBLIC_URL}/${process.env.BOT_TOKEN}`

  const { url: currentWebhookUrl } = await bot.telegram.getWebhookInfo()

  if (currentWebhookUrl !== webhookUrl) {
    await bot.telegram.deleteWebhook()

    await bot.telegram.setWebhook(webhookUrl)
  }

  terminus(server, {
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
        mongoose.disconnect().catch(console.log),
      ]),
    logger: console.log,
  })

  await util.promisify(cb => server.listen(process.env.PORT, cb))()

  console.log(`Listening on ${process.env.PORT}`)
})().catch(console.log)
