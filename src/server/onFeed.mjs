import { XMLParser } from "fast-xml-parser"
import he from "he"

import { bot } from "../bot/index.mjs"
import { subscriptionCollection, videoCollection } from "../mongodb.mjs"

const end = res => res.writeHead(204).end()

export const onFeed = async (req, res) => {
  let rawBody = ""

  for await (const chunk of req) rawBody += chunk

  console.log(rawBody)

  const message = new XMLParser({
    attributeNamePrefix: "",
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    attributeValueProcessor: (_, value) =>
      he.decode(value, { isAttributeValue: true }),
    tagValueProcessor: (_, value) => he.decode(value),
  }).parse(rawBody)

  if (!message.feed?.entry) {
    return end(res)
  }

  const {
    feed: {
      entry: {
        "yt:videoId": videoId,
        "yt:channelId": channelId,
        title,
        author: { name },
      },
    },
  } = message

  try {
    await videoCollection.insertOne({ _id: videoId })
  } catch {
    return end(res)
  }

  if (title.includes("#shorts")) {
    return end(res)
  }

  const cursor = await subscriptionCollection.find({
    "_id.channelId": channelId,
  })

  for await (const x of cursor) {
    await bot.telegram.sendMessage(
      x._id.chatId,
      `[${name} - ${title}](https://www.youtube.com/watch?v=${videoId})`,
      { parse_mode: "Markdown" },
    )
  }

  end(res)
}
