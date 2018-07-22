import { getYoutubeClient } from "../google"
import { Subscription } from "../models/subscription"

export const onSubscriptionsCommand = async ctx => {
  const subscriptions = await Subscription.find({ user: ctx.state.user.id })

  const youtube = getYoutubeClient(ctx.state.user.refreshToken)

  const channels = []

  const maxResults = 50

  let index = 0

  do {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await youtube.channels.list({
      part: "snippet",
      maxResults,
      id: subscriptions
        .slice(index, index + maxResults)
        .map(({ channelId }) => channelId)
        .toString(),
    })

    channels.push(...data.items.map(({ snippet }) => snippet.title))

    index += maxResults
  } while (index < subscriptions.length)

  return ctx.reply(channels)
}
