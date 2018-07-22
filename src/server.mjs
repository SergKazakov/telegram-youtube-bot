import express from "express"
import { pubsub } from "./pubsub"
import { bot } from "./bot"
import { getOauth2Client } from "./google"
import { User } from "./models/user"

export const server = express()

server
  .use(bot.webhookCallback(`/${process.env.BOT_TOKEN}`))
  .use("/pubsubhubbub", pubsub.listener())
  .get("/oauth2callback", async (req, res) => {
    const {
      query: { code, state },
    } = req

    const { tokens } = await getOauth2Client().getToken(code)

    const { userId, chatId } = JSON.parse(state)

    const user = await User.findOne({ userId })

    if (!user) {
      await User.create({
        userId,
        chatId,
        refreshToken: tokens.refresh_token,
      })
    }

    await bot.telegram.sendMessage(chatId, "Success login")

    res.sendStatus(204)
  })
