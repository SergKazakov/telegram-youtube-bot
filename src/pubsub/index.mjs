import util from "util"
import pubsubhubbub from "pubsubhubbub"
import { onFeed } from "./onFeed"

export const pubsub = pubsubhubbub.createServer({
  callbackUrl: `${process.env.PUBLIC_URL}/pubsubhubbub`,
})

pubsub.on("feed", onFeed)

export const subscribeToYoutubeChannel = channelId =>
  util.promisify(cb =>
    pubsub.subscribe(
      `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
      "https://pubsubhubbub.appspot.com",
      cb,
    ),
  )()
