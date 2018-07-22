import xmlParser from "fast-xml-parser"
import { bot } from "../bot"
import { User } from "../models/user"
import { Subscription } from "../models/subscription"

export const onFeed = async ({ topic, feed }) => {
  try {
    const [, channelId] = topic.split("=")

    const {
      feed: {
        entry: {
          link: { href },
        },
      },
    } = xmlParser.parse(feed.toString(), {
      attributeNamePrefix: "",
      ignoreAttributes: false,
      allowBooleanAttributes: true,
    })

    const subscriptions = await Subscription.find({ channelId })

    const subscribers = await User.find({
      _id: { $in: subscriptions.map(({ user }) => user) },
      chatId: { $ne: null },
    })

    await Promise.all(
      subscribers.map(({ chatId }) => bot.telegram.sendMessage(chatId, href)),
    )
  } catch (err) {
    console.log(err)
  }
}
