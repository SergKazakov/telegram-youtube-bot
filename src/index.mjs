import util from "util"

import Telegraf from "telegraf"
import express from "express"
import pubsubhubbub from "pubsubhubbub"
import googleapis from "googleapis"
import mongoose from "mongoose"
import xmlParser from "fast-xml-parser"
import { User } from "./models/user"
import { subscribeToYoutubeChannel } from "./pubsubhubbub/subscribeToYoutubeChannel"
;(async () => {
  const oauth2Client = new googleapis.google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL,
  )

  const bot = new Telegraf(process.env.BOT_TOKEN)

  bot
    .use(async (ctx, next) => {
      const user = await User.findOne({ userId: ctx.from.id })

      ctx.state.user = user

      return next()
    })
    .use(async (ctx, next) => {
      try {
        await next()
      } catch ({ message }) {
        return ctx.reply(message)
      }
    })

  await bot.telegram.deleteWebhook()

  await bot.telegram.setWebhook(
    `${process.env.PUBLIC_URL}/${process.env.BOT_TOKEN}`,
  )

  const getUser = async (ctx, next) => {
    if (ctx.state.user) {
      return next()
    }

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/youtube.readonly"],
      state: JSON.stringify({ userId: ctx.from.id, chatId: ctx.chat.id }),
    })

    return ctx.reply(url)
  }

  const pubsub = pubsubhubbub.createServer({
    callbackUrl: `${process.env.PUBLIC_URL}/pubsubhubbub`,
  })

  bot.command("subscribe", getUser, async ctx => {
    oauth2Client.setCredentials(ctx.state.user.tokens)

    const youtube = googleapis.google.youtube({
      version: "v3",
      auth: oauth2Client,
    })

    const channels = []

    let nextPage = null

    do {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await util.promisify(cb =>
        youtube.subscriptions.list(
          {
            mine: true,
            maxResults: 10,
            part: "snippet",
            ...(nextPage && { pageToken: nextPage }),
          },
          cb,
        ),
      )()

      channels.push(
        ...data.items.map(({ snippet }) => snippet.resourceId.channelId),
      )

      nextPage = data.nextPageToken
    } while (nextPage)

    await ctx.state.user.update({ channels })

    await Promise.all(channels.map(id => subscribeToYoutubeChannel(pubsub, id)))

    return ctx.reply("success")
  })

  pubsub.on("feed", async ({ topic, feed }) => {
    const [, channelId] = topic.split(
      "https://www.youtube.com/xml/feeds/videos.xml?channel_id=",
    )

    const message = xmlParser.getTraversalObj(feed.toString())

    const subscribers = await User.find({
      chatId: { $ne: null },
      channels: channelId,
    })

    await Promise.all(
      subscribers.map(({ chatId }) =>
        bot.telegram.sendMessage(chatId, message),
      ),
    )
  })

  await mongoose.connect(
    process.env.MONGODB_URL,
    { useNewUrlParser: true },
  )

  const server = express()

  server
    .use(bot.webhookCallback(`/${process.env.BOT_TOKEN}`))
    .use("/pubsubhubbub", pubsub.listener())
    .get("/oauth2callback", async (req, res) => {
      const {
        query: { code, state },
      } = req

      const { tokens } = await oauth2Client.getToken(code)

      const { userId, chatId } = JSON.parse(state)

      const user = await User.findOne({ userId })

      if (!user) {
        await User.create({ userId, chatId, tokens })
      }

      await bot.telegram.sendMessage(chatId, "Success login")

      res.sendStatus(204)
    })

  await util.promisify(cb => server.listen(process.env.SERVER_PORT, cb))()

  console.log(`Listening on ${process.env.SERVER_PORT}`)
})().catch(console.log)
