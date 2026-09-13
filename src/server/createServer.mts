import { ValidationError } from "yup"

import { env } from "../env.mts"

import { confirmSubscription } from "./confirmSubscription.mts"
import { healthCheck } from "./healthCheck.mts"
import { oAuth2Callback } from "./oAuth2Callback.mts"
import { onFeed } from "./onFeed.mts"

export const app = async (request: Request) => {
  try {
    const handler = {
      "HEAD/healthcheck": healthCheck,
      "GET/pubsubhubbub": confirmSubscription,
      "POST/pubsubhubbub": onFeed,
      "GET/oauth2callback": oAuth2Callback,
    }[request.method + new URL(request.url).pathname]

    return handler
      ? await handler(request)
      : new Response(null, { status: 404 })
  } catch (error) {
    console.error(error)

    return new Response(null, {
      status: error instanceof ValidationError ? 400 : 500,
    })
  }
}

export const createServer = () => Bun.serve({ port: env.PORT, fetch: app })
