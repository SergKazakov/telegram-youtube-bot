import util from "util"

export const subscribeToYoutubeChannel = (pubsub, channelId) =>
  util.promisify(cb =>
    pubsub.subscribe(
      `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
      "https://pubsubhubbub.appspot.com",
      cb,
    ),
  )()
