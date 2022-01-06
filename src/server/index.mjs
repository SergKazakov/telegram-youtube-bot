import http from "node:http"

import { pubsub } from "../pubsub"
import { bot } from "../bot"

import { oauth2Callback } from "./oauth2Callback"

export const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, process.env.PUBLIC_URL)

  const webhookUrl = "/bot-webhook"

  if (pathname === webhookUrl) {
    return bot.webhookCallback(webhookUrl)(req, res)
  }

  if (pathname === "/pubsubhubbub") {
    return pubsub.listener()(req, res)
  }

  if (req.method === "GET" && pathname === "/oauth2callback") {
    return oauth2Callback(req, res)
  }

  res.writeHead(404).end()
})
