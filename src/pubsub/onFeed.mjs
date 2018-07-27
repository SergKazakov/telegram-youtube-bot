import xmlParser from "fast-xml-parser"
import { bot } from "../bot"
import { User } from "../models/user"
import { Subscription } from "../models/subscription"

export const onFeed = async ({ topic, feed }) => {
  try {
    const [, channelId] = topic.split("=")

    const message = xmlParser.parse(feed.toString(), {
      attributeNamePrefix: "",
      ignoreAttributes: false,
      allowBooleanAttributes: true,
    })

    console.log(JSON.stringify(message))

    const {
      feed: {
        entry: { link },
      },
    } = message

    console.log(link)

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
