import { createServer } from "node:http"

import { ValidationError } from "yup"

import { webhook } from "../bot/index.mjs"

import { confirmSubscription } from "./confirmSubscription.mjs"
import { healthCheck } from "./healthCheck.mjs"
import { oAuth2Callback } from "./oAuth2Callback.mjs"
import { onFeed } from "./onFeed.mjs"

export const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url as string, process.env.PUBLIC_URL)

    if (pathname === "/healthcheck") {
      return await healthCheck(res)
    }

    if (req.method === "GET" && pathname === "/pubsubhubbub") {
      return await confirmSubscription(res)
    }

    if (req.method === "POST" && pathname === "/pubsubhubbub") {
      return await onFeed(res)
    }

    if (req.method === "GET" && pathname === "/oauth2callback") {
      return await oAuth2Callback(res)
    }

    await webhook(req, res)
  } catch (error) {
    console.error(error)

    res.writeHead(error instanceof ValidationError ? 400 : 500).end()
  }
})
