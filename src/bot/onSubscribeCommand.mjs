import { getYoutubeClient } from "../google"
import { subscribeToYoutubeChannel } from "../pubsub"
import { Subscription } from "../models/subscription"

export const onSubscribeCommand = async ctx => {
  const youtube = getYoutubeClient(ctx.state.user.refreshToken)

  const channels = []

  let nextPage = null

  do {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await youtube.subscriptions.list({
      mine: true,
      maxResults: 50,
      part: "snippet",
      ...(nextPage && { pageToken: nextPage }),
    })

    channels.push(
      ...data.items.map(({ snippet }) => snippet.resourceId.channelId),
    )

    nextPage = data.nextPageToken
  } while (nextPage)

  const {
    state: { user },
  } = ctx

  const newSubscriptions = []

  await Promise.all(
    channels.map(async channelId => {
      const subscription = await Subscription.findOne({
        user: user.id,
        channelId,
      })

      if (subscription) {
        return
      }

      await subscribeToYoutubeChannel(channelId)

      const { id } = await Subscription.create({ channelId, user: user.id })

      newSubscriptions.push(id)
    }),
  )

  if (newSubscriptions.length > 0) {
    await user.update({ $push: { subscriptions: newSubscriptions } })
  }

  return ctx.reply("success")
}
