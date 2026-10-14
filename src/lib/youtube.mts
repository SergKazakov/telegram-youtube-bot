import { type youtube_v3 as youtubeV3 } from "@googleapis/youtube"
import { youtube } from "@googleapis/youtube"
import axios from "axios"

import { env } from "../env.mts"
import { type FeedEntry } from "../schemas.mts"

import { getOAuth2Client } from "./oauth.mts"

export const getYoutubeClient = (refreshToken: string) => {
  const auth = getOAuth2Client()

  auth.setCredentials({ refresh_token: refreshToken })

  return youtube({ version: "v3", auth })
}

type YoutubeClient = ReturnType<typeof getYoutubeClient>

export const getSubscriptions = async (
  client: YoutubeClient,
  rest: Partial<youtubeV3.Params$Resource$Subscriptions$List> = {},
) => {
  const { data } = await client.subscriptions.list({
    maxResults: 50,
    mine: true,
    order: "alphabetical",
    part: ["snippet"],
    ...rest,
  })

  return {
    items: data.items
      ? data.items.reduce<{ channelId: string; title: string }[]>((acc, it) => {
          const channelId = it.snippet?.resourceId?.channelId

          const title = it.snippet?.title

          if (channelId && title) {
            acc.push({ channelId, title })
          }

          return acc
        }, [])
      : [],
    nextPageToken: data.nextPageToken,
  }
}

export const getAllSubscriptions = async function* (client: YoutubeClient) {
  let pageToken: youtubeV3.Schema$SubscriptionListResponse["nextPageToken"]

  do {
    const { items, nextPageToken } = await getSubscriptions(client, {
      ...(pageToken && { pageToken }),
    })

    yield* items

    pageToken = nextPageToken
  } while (pageToken)
}

export const deleteSubscription = async (
  client: YoutubeClient,
  channelId: string,
) => {
  const {
    data: { items },
  } = await client.subscriptions.list({
    forChannelId: channelId,
    mine: true,
    part: ["id"],
  })

  const id = items?.[0]?.id

  if (id) {
    await client.subscriptions.delete({ id })
  }
}

export const isRefreshTokenValid = async (client: YoutubeClient) => {
  try {
    await client.channels.list({ mine: true, maxResults: 1, part: ["id"] })

    return true
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_grant") {
      return false
    }

    throw error
  }
}

export const getEntries = async (channelId: string) => {
  const { data } = await axios<string>(buildFeedUrlToPoll(channelId), {
    timeout: env.FEED_TIMEOUT,
  })

  const {
    feed: { entry },
  } = Bun.XML.parse(data.trim()) as unknown as {
    feed: { entry: FeedEntry | FeedEntry[] }
  }

  return Array.isArray(entry) ? entry : [entry]
}

export const youtubeBaseUrl = "https://www.youtube.com"

export const buildChannelUrl = (channelId: string) =>
  `${youtubeBaseUrl}/channel/${channelId}`

export const buildFeedUrlToPoll = (channelId: string) =>
  `${youtubeBaseUrl}/feeds/videos.xml?channel_id=${channelId}`

export const buildFeedUrlToSubscribe = (channelId: string) =>
  `${youtubeBaseUrl}/xml/feeds/videos.xml?channel_id=${channelId}`

export const buildVideoUrl = (videoId: string) =>
  `${youtubeBaseUrl}/watch?v=${videoId}`
