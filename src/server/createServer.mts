import { ValidationError } from "yup"

import { env } from "../env.mts"

import { confirmSubscription } from "./confirmSubscription.mts"
import { healthCheck } from "./healthCheck.mts"
import { oAuth2Callback } from "./oAuth2Callback.mts"
import { onFeed } from "./onFeed.mts"

export const createServer = () =>
  Bun.serve({
    port: Bun.env.NODE_ENV === "test" ? 0 : env.PORT,
    routes: {
      "/healthcheck": { HEAD: healthCheck },
      "/pubsubhubbub": { GET: confirmSubscription, POST: onFeed },
      "/oauth2callback": { GET: oAuth2Callback },
    },
    error(error) {
      console.error(error)

      return new Response(null, {
        status: error instanceof ValidationError ? 400 : 500,
      })
    },
  })
