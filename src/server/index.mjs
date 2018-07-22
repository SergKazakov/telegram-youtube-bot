import express from "express"
import { pubsub } from "../pubsub"
import { bot } from "../bot"
import { oauth2Callback } from "./oauth2Callback"
import { errorHandler } from "./errorHandler"

export const server = express()

server
  .use(bot.webhookCallback(`/${process.env.BOT_TOKEN}`))
  .use("/pubsubhubbub", pubsub.listener())
  .get("/oauth2callback", oauth2Callback)
  .use(errorHandler)
