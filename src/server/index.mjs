import http from "http"
import url from "url"

import { pubsub } from "../pubsub"
import { bot } from "../bot"

import { oauth2Callback } from "./oauth2Callback"

export const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)

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

  res.writeHead(404)

  res.end()
})
