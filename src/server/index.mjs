import { createServer } from "node:http"

import { webhook } from "../bot/index.mjs"
import { pubsub } from "../pubsub/index.mjs"

import { oauth2Callback } from "./oauth2Callback.mjs"

export const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, process.env.PUBLIC_URL)

  if (pathname === "/pubsubhubbub") {
    return pubsub.listener()(req, res)
  }

  if (req.method === "GET" && pathname === "/oauth2callback") {
    return oauth2Callback(req, res)
  }

  webhook(req, res)
})
