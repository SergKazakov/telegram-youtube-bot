import { createServer } from "node:http"

import { ValidationError } from "yup"

import { confirmSubscription } from "./confirmSubscription.mts"
import { healthCheck } from "./healthCheck.mts"
import { oAuth2Callback } from "./oAuth2Callback.mts"
import { onFeed } from "./onFeed.mts"

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

    res.writeHead(404).end()
  } catch (error) {
    console.error(error)

    res.writeHead(error instanceof ValidationError ? 400 : 500).end()
  }
})
