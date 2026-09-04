import { type youtube_v3 as youtubeV3 } from "@googleapis/youtube"
import { auth, youtube } from "@googleapis/youtube"
import axios from "axios"
import dayjs from "dayjs"
import type * as yup from "yup"

import { env } from "./env.mts"
import { videoCollection } from "./mongodb.mts"
import { type FeedEntry, normalizeLinks } from "./schemas.mts"

export const parseSearchParams = <T extends yup.AnySchema>(
  schema: T,
  request: Request,
) => schema.validate(Object.fromEntries(new URL(request.url).searchParams))

export const getOAuth2Client = () =>
  new auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.PUBLIC_URL}/oauth2callback`,
  )

const hmac = (data: string) =>
  new Bun.CryptoHasher("sha256", env.OAUTH_SECRET).update(data).digest("hex")

export const signState = (chatId: string) => {
  const ts = Date.now()

  return btoa(`${chatId}.${ts}.${hmac(`${chatId}.${ts}`)}`)
}

export const verifyState = (state: string) => {
  let decoded: string

  try {
    decoded = atob(state)
  } catch {
    return null
  }

  const [chatId, ts, signature] = decoded.split(".", 3)

  if (
    !chatId
    || !ts
    || !signature
    || signature !== hmac(`${chatId}.${ts}`)
    || dayjs().diff(Number(ts), "m") > 10
  ) {
    return null
  }

  return chatId
}

export const getYoutubeClient = (refreshToken: string) => {
  const auth = getOAuth2Client()

  auth.setCredentials({ refresh_token: refreshToken })

  return youtube({ version: "v3", auth })
}

export const getSubscriptions = async ({
  refreshToken,
  ...rest
}: {
  refreshToken: string
} & Partial<youtubeV3.Params$Resource$Subscriptions$List>) => {
  const { data } = await getYoutubeClient(refreshToken).subscriptions.list({
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

export const youtubeBaseUrl = "https://www.youtube.com"

export const buildChannelUrl = (channelId: string) =>
  `${youtubeBaseUrl}/channel/${channelId}`

export const buildVideoUrl = (videoId: string) =>
  `${youtubeBaseUrl}/watch?v=${videoId}`

export const buildFeedUrlToSubscribe = (channelId: string) =>
  `${youtubeBaseUrl}/xml/feeds/videos.xml?channel_id=${channelId}`

export const subscribeToChannel = (id: string) =>
  axios.post(
    "https://pubsubhubbub.appspot.com",
    new URLSearchParams([
      ["hub.callback", `${env.PUBLIC_URL}/pubsubhubbub`],
      ["hub.mode", "subscribe"],
      ["hub.topic", buildFeedUrlToSubscribe(id)],
      ["hub.verify", "async"],
    ]),
    { timeout: env.HUB_TIMEOUT },
  )

type Feed = { feed: { entry: FeedEntry | FeedEntry[] } }

export const getEntriesByChannelId = async (channelId: string) => {
  const { data } = await axios<string>(
    `${youtubeBaseUrl}/feeds/videos.xml?channel_id=${channelId}`,
  )

  const {
    feed: { entry },
  } = Bun.XML.parse(data.trim()) as unknown as Feed

  return Array.isArray(entry) ? entry : [entry]
}

export const shouldProcessEntry = async (entry: FeedEntry) => {
  if (
    !entry.published
    || dayjs().diff(entry.published, "d", true) > env.DAYS_TO_IGNORE_VIDEO
    || normalizeLinks(entry.link).some(it => it["@href"].includes("/shorts/"))
  ) {
    return false
  }

  try {
    await videoCollection.insertOne({
      _id: entry["yt:videoId"],
      publishedAt: new Date(entry.published),
      authorName: entry.author.name,
      title: entry.title,
    })
  } catch {
    return false
  }

  return true
}
