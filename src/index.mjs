import util from "util"

import mongoose from "mongoose"
import { bot } from "./bot"
import { server } from "./server"
;(async () => {
  const { username } = await bot.telegram.getMe()

  bot.options.username = username

  const webhookUrl = `${process.env.PUBLIC_URL}/${process.env.BOT_TOKEN}`

  const { url: currentWebhookUrl } = await bot.telegram.getWebhookInfo()

  if (currentWebhookUrl !== webhookUrl) {
    await bot.telegram.deleteWebhook()

    await bot.telegram.setWebhook(webhookUrl)
  }

  await mongoose.connect(
    process.env.MONGODB_URL,
    { useNewUrlParser: true },
  )

  await util.promisify(cb => server.listen(process.env.SERVER_PORT, cb))()

  console.log(`Listening on ${process.env.SERVER_PORT}`)
})().catch(console.log)
