import { XMLParser } from "fast-xml-parser"
import he from "he"
import dayjs from "dayjs"

import { bot } from "../bot/index.mjs"
import { User, Subscription } from "../models/index.mjs"
import { redis } from "../redis.mjs"
import { handleError } from "../utils/handleError.mjs"

export const onFeed = handleError(async ({ topic, feed }) => {
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

  const {
    feed: { entry },
  } = message

  if (!entry) {
    return
  }

  const {
    link,
    "yt:videoId": videoId,
    published,
    title,
    author: { name },
  } = entry

  if (dayjs().diff(dayjs(published), "days", true) > 1) {
    return
  }

  if (await redis.get(videoId)) {
    return
  }

  await redis.setex(videoId, 30 * 24 * 60 * 60, true)

  const subscriptions = await Subscription.find({ channelId })

  const subscribers = await User.find({
    _id: { $in: subscriptions.map(x => x.user) },
    chatId: { $type: "number" },
  })

  await Promise.all(
    subscribers.map(({ chatId }) =>
      bot.telegram.sendMessage(
        chatId,
        `[${name} - ${title}](${
          Array.isArray(link) ? link[0].href : link.href
        })`,
        { parse_mode: "Markdown" },
      ),
    ),
  )
})
