import axios from "axios"

import { env } from "../env.mts"

import { createHmac } from "./crypto.mts"
import { buildFeedUrlToSubscribe } from "./youtube.mts"

export const signHub = (body: string) =>
  `sha1=${createHmac(body, env.HUB_SECRET, "sha1")}`

export const subscribeToChannel = (id: string) =>
  axios.post(
    "https://pubsubhubbub.appspot.com",
    new URLSearchParams([
      ["hub.callback", `${env.PUBLIC_URL}/pubsubhubbub`],
      ["hub.mode", "subscribe"],
      ["hub.secret", env.HUB_SECRET],
      ["hub.topic", buildFeedUrlToSubscribe(id)],
      ["hub.verify", "async"],
    ]),
    { timeout: env.HUB_TIMEOUT },
  )
