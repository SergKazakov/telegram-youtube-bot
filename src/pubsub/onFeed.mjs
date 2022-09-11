import { XMLParser } from "fast-xml-parser"
import he from "he"

import { bot } from "../bot/index.mjs"
import { videoCollection, subscriptionCollection } from "../mongodb.mjs"

export const onFeed = async ({ topic, feed }) => {
  const [, channelId] = topic.split("=")

  const message = new XMLParser({
    attributeNamePrefix: "",
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    attributeValueProcessor: (_, value) =>
      he.decode(value, { isAttributeValue: true }),
    tagValueProcessor: (_, value) => he.decode(value),
  }).parse(feed.toString())

  console.log(JSON.stringify(message, null, 2))

  if (!message.feed?.entry) {
    return
  }

  const {
    feed: {
      entry: {
        link,
        "yt:videoId": videoId,
        title,
        author: { name },
      },
    },
  } = message

  try {
    await videoCollection.insertOne({ _id: videoId })
  } catch {
    return
  }

  const subscriptions = await subscriptionCollection
    .find({ "_id.channelId": channelId })
    .toArray()

  await Promise.all(
    subscriptions.map(x =>
      bot.telegram.sendMessage(
        x._id.chatId,
        `[${name} - ${title}](${
          Array.isArray(link) ? link[0].href : link.href
        })`,
        { parse_mode: "Markdown" },
      ),
    ),
  )
}
