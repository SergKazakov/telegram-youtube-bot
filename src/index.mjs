import util from "util"

import mongoose from "mongoose"
import { bot } from "./bot"
import { server } from "./server"
;(async () => {
  await mongoose.connect(
    process.env.MONGODB_URL,
    { useNewUrlParser: true },
  )

  const webhookUrl = `${process.env.PUBLIC_URL}/${process.env.BOT_TOKEN}`

  const { url: currentWebhookUrl } = await bot.telegram.getWebhookInfo()

  if (currentWebhookUrl !== webhookUrl) {
    await bot.telegram.deleteWebhook()

    await bot.telegram.setWebhook(webhookUrl)
  }

  await util.promisify(cb => server.listen(process.env.PORT, cb))()

  console.log(`Listening on ${process.env.PORT}`)
})().catch(console.log)
