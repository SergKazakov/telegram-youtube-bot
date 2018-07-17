import util from "util"

import Telegraf from "telegraf"
import express from "express"
import pubsubhubbub from "pubsubhubbub"
import { subscribeToYoutubeChannel } from "./pubsubhubbub/subscribeToYoutubeChannel"
;(async () => {
  const bot = new Telegraf(process.env.BOT_TOKEN)

  bot.use(async (ctx, next) => {
    try {
      await next()
    } catch ({ message }) {
      ctx.reply(message)
    }
  })

  await bot.telegram.deleteWebhook()

  await bot.telegram.setWebhook(
    `https://3cd63a48.ngrok.io/${process.env.BOT_TOKEN}`,
  )

  const pubsub = pubsubhubbub.createServer({
    callbackUrl: `https://3cd63a48.ngrok.io/pubsubhubbub`,
  })

  pubsub.on("subscribe", console.log)

  bot.context.pubsub = pubsub

  bot.hears(/\/subscribe (.+)/, async ctx => {
    await subscribeToYoutubeChannel(ctx.pubsub, ctx.message.text.split(" ")[1])

    ctx.reply("OK")
  })

  const server = express()

  server
    .use(bot.webhookCallback(`/${process.env.BOT_TOKEN}`))
    .use("/pubsubhubbub", pubsub.listener())

  await util.promisify(cb => server.listen(process.env.SERVER_PORT, cb))()

  console.log(`Listening on ${process.env.SERVER_PORT}`)
})().catch(console.log)
