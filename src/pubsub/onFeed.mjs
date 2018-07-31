import xmlParser from "fast-xml-parser"
import Redis from "ioredis"
import { bot } from "../bot"
import { User } from "../models/user"
import { Subscription } from "../models/subscription"

const redis = new Redis(process.env.REDIS_URL)

export const onFeed = async ({ topic, feed }) => {
  try {
    const [, channelId] = topic.split("=")

    const {
      feed: { entry },
    } = xmlParser.parse(feed.toString(), {
      attributeNamePrefix: "",
      ignoreAttributes: false,
      allowBooleanAttributes: true,
    })

    if (!entry) {
      return
    }

    const { link, "yt:videoId": videoId } = entry

    if (await redis.get(videoId)) {
      return
    }

    const WEEK = 7 * 24 * 60 * 60

    await redis.setex(videoId, WEEK)

    const subscriptions = await Subscription.find({
      channelId,
      isNotificationEnabled: true,
    })

    const subscribers = await User.find({
      _id: { $in: subscriptions.map(({ user }) => user) },
      chatId: { $ne: null },
    })

    await Promise.all(
      subscribers.map(({ chatId }) =>
        bot.telegram.sendMessage(
          chatId,
          Array.isArray(link) ? link[0].href : link.href,
        ),
      ),
    )
  } catch (err) {
    console.log(err)
  }
}
