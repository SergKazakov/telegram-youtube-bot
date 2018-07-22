import xmlParser from "fast-xml-parser"
import { bot } from "../bot"
import { User } from "../models/user"

export const onFeed = async ({ topic, feed }) => {
  try {
    const [, channelId] = topic.split("=")

    const message = xmlParser.parse(feed.toString(), {
      attributeNamePrefix: "",
      ignoreAttributes: false,
      allowBooleanAttributes: true,
    })

    console.log(message)

    const {
      feed: {
        entry: {
          link: { href },
        },
      },
    } = message

    const subscribers = await User.find({
      chatId: { $ne: null },
      channels: channelId,
    })

    await Promise.all(
      subscribers.map(({ chatId }) => bot.telegram.sendMessage(chatId, href)),
    )
  } catch (err) {
    console.log(err)
  }
}
