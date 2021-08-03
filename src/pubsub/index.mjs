import { promisify } from "node:util"
import pubsubhubbub from "pubsubhubbub"

import { onFeed } from "./onFeed"
import { onSubscribe } from "./onSubscribe"

export const pubsub = pubsubhubbub.createServer({
  callbackUrl: `${process.env.PUBLIC_URL}/pubsubhubbub`,
})

pubsub.on("feed", onFeed)

pubsub.on("subscribe", onSubscribe)

export const emitEvent = event => channelId =>
  promisify(cb =>
    pubsub[event](
      `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
      "https://pubsubhubbub.appspot.com",
      cb,
    ),
  )()
