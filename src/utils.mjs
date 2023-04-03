import axios from "axios"

export const parseSearchParams = req =>
  Object.fromEntries(new URL(req.url, process.env.PUBLIC_URL).searchParams)

export const subscribeToChannel = async channelId => {
  await axios.post(
    "https://pubsubhubbub.appspot.com",
    new URLSearchParams([
      ["hub.callback", `${process.env.PUBLIC_URL}/pubsubhubbub`],
      ["hub.mode", "subscribe"],
      [
        "hub.topic",
        `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
      ],
      ["hub.verify", "async"],
    ]),
  )
}
