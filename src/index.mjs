import util from "util"

import mongoose from "mongoose"
import { bot } from "./bot"
import { server } from "./server"
;(async () => {
  await bot.telegram.deleteWebhook()

  await bot.telegram.setWebhook(
    `${process.env.PUBLIC_URL}/${process.env.BOT_TOKEN}`,
  )

  await mongoose.connect(
    process.env.MONGODB_URL,
    { useNewUrlParser: true },
  )

  await util.promisify(cb => server.listen(process.env.SERVER_PORT, cb))()

  console.log(`Listening on ${process.env.SERVER_PORT}`)
})().catch(console.log)
