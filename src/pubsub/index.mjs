import { promisify } from "node:util"

import pubsubhubbub from "pubsubhubbub"

import { onFeed } from "./onFeed.mjs"
import { onSubscribe } from "./onSubscribe.mjs"

export const pubsub = pubsubhubbub.createServer({
  callbackUrl: `${process.env.PUBLIC_URL}/pubsubhubbub`,
})

for (const [event, listener] of Object.entries({
  feed: onFeed,
  subscribe: onSubscribe,
})) {
  pubsub.on(event, async (...args) => {
    try {
      await listener(...args)
    } catch (error) {
      console.error(error)
    }
  })
}

export const emitEvent = event => channelId =>
  promisify(cb =>
    pubsub[event](
      `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
      "https://pubsubhubbub.appspot.com",
      cb,
    ),
  )()
