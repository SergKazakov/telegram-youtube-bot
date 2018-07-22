import { getOauth2Client, getYoutubeClient } from "../google"
import { subscribeToYoutubeChannel } from "../pubsub"

export const onSubscribeCommand = async ctx => {
  const oauth2Client = getOauth2Client()

  oauth2Client.setCredentials({
    refresh_token: ctx.state.user.refreshToken,
  })

  const youtube = getYoutubeClient(oauth2Client)

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

  await ctx.state.user.update({ channels })

  await Promise.all(channels.map(id => subscribeToYoutubeChannel(id)))

  return ctx.reply("success")
}
