import util from "util"

import mongoose from "mongoose"
import { bot } from "./bot"
import { server } from "./server"
;(async () => {
  const webhookUrl = `${process.env.PUBLIC_URL}/${process.env.BOT_TOKEN}`

  const [{ username }, { url: currentWebhookUrl }] = await Promise.all([
    bot.telegram.getMe(),
    bot.telegram.getWebhookInfo(),
  ])

  bot.options.username = username

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
