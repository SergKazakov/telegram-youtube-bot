import terminus from "@godaddy/terminus"

import { bot } from "./bot/index.mjs"
import { mongoClient, chatCollection } from "./mongodb.mjs"
import { server } from "./server/index.mjs"

if (process.env.NODE_ENV === "production") {
  const webhookUrl = `${process.env.PUBLIC_URL}/${process.env.BOT_TOKEN}`

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
    async "/healthcheck"() {
      await chatCollection.findOne()
    },
  },
  signals: ["SIGINT", "SIGTERM"],
  onSignal: () => mongoClient.close().catch(console.error),
  logger: console.log,
})

server.listen(process.env.PORT, () =>
  console.log(`Listening on ${process.env.PORT}`),
)
