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

export const subscribeToChannel = id =>
  promisify(cb =>
    pubsub.subscribe(
      `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${id}`,
      "https://pubsubhubbub.appspot.com",
      cb,
    ),
  )()
