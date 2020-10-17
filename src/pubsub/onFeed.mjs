import xmlParser from "fast-xml-parser"
import he from "he"
import Dumper from "dumper.js/src/dumper"
import dayjs from "dayjs"

import { bot } from "../bot"
import { User } from "../models/user"
import { Subscription } from "../models/subscription"
import { redis } from "../redis"
import { handleError } from "../utils/handleError"

export const onFeed = handleError(async ({ topic, feed }) => {
  const [, channelId] = topic.split("=")

  const message = xmlParser.parse(feed.toString(), {
    attributeNamePrefix: "",
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    attrValueProcessor: a => he.decode(a, { isAttributeValue: true }),
    tagValueProcessor: x => he.decode(x),
  })

  console.log(new Dumper().generateDump(message))

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
