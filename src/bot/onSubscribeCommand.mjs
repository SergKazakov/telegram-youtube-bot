import { getYoutubeClient } from "../google"
import { emitEvent } from "../pubsub"
import { Subscription } from "../models/subscription"

export const onSubscribeCommand = async ctx => {
  const youtube = getYoutubeClient(ctx.state.user.refreshToken)

  const channels = []

  let nextPage

  do {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await youtube.subscriptions.list({
      mine: true,
      maxResults: 50,
      part: "snippet",
      ...(nextPage && { pageToken: nextPage }),
    })

    channels.push(
      ...data.items.map(
        ({
          snippet: {
            resourceId: { channelId },
          },
        }) => channelId,
      ),
    )

    nextPage = data.nextPageToken
  } while (nextPage)

  const {
    state: { user },
  } = ctx

  await Subscription.deleteMany({ user: user.id })

  const newSubscriptions = await Subscription.create(
    channels.map(x => ({ channelId: x, user: user.id })),
  )

  await user.updateOne({ subscriptions: newSubscriptions.map(x => x.id) })

  for (const x of channels) {
    // eslint-disable-next-line no-await-in-loop
    await emitEvent("subscribe")(x)
  }

  return ctx.reply(`You were subscribed to ${newSubscriptions.length} channels`)
}
