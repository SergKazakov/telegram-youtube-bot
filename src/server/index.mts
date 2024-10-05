import { createServer } from "node:http"

import { ValidationError } from "yup"

import { confirmSubscription } from "./confirmSubscription.mts"
import { healthCheck } from "./healthCheck.mts"
import { oAuth2Callback } from "./oAuth2Callback.mts"
import { onFeed } from "./onFeed.mts"

export const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url as string, process.env.PUBLIC_URL)

    const handler = {
      "HEAD/healthcheck": healthCheck,
      "GET/pubsubhubbub": confirmSubscription,
      "POST/pubsubhubbub": onFeed,
      "GET/oauth2callback": oAuth2Callback,
    }[req.method + pathname]

    return handler ? await handler(res) : res.writeHead(404).end()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)

    res.writeHead(error instanceof ValidationError ? 400 : 500).end()
  }
})
