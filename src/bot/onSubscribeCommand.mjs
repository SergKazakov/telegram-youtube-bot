import { getYoutubeClient } from "../google"
import { emitEvent } from "../pubsub"
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
      ...data.items.map(
        ({
          snippet: {
            title,
            resourceId: { channelId },
          },
        }) => ({ channelId, title }),
      ),
    )

    nextPage = data.nextPageToken
  } while (nextPage)

  const {
    state: { user },
  } = ctx

  await Subscription.remove({ user: user.id })

  const newSubscriptions = []

  await Promise.all(
    channels.map(async ({ channelId, ...rest }) => {
      await emitEvent("subscribe")(channelId)

      const { id } = await Subscription.create({
        channelId,
        user: user.id,
        ...rest,
      })

      newSubscriptions.push(id)
    }),
  )

  await user.update({ subscriptions: newSubscriptions })

  return ctx.reply("success")
}
