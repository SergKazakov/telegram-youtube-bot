import http from "http"

import { pubsub } from "../pubsub"
import { bot } from "../bot"
import { oauth2Callback } from "./oauth2Callback"

export const server = http.createServer((req, res) => {
  const webhookUrl = `/${process.env.BOT_TOKEN}`

  if (req.url.includes(webhookUrl)) {
    return bot.webhookCallback(webhookUrl)(req, res)
  }

  if (req.url.includes("/pubsubhubbub")) {
    return pubsub.listener()(req, res)
  }

  if (req.method === "GET" && req.url.includes("/oauth2callback")) {
    return oauth2Callback(req, res)
  }

  res.writeHead(404)

  res.end()
})
