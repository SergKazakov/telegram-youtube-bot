import dayjs from "dayjs"
import { MongoServerError } from "mongodb"

import { env } from "../env.mts"
import { getEntries, getVideoThumbnail } from "../lib/youtube.mts"
import {
  type ChannelSchema,
  type DeliverySchema,
  channelCollection,
  claimLocked,
  deliveryCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"
import { type FeedEntry, normalizeLinks } from "../schemas.mts"

const shouldProcessEntry = async (entry: FeedEntry) => {
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
      thumbnail: await getVideoThumbnail(entry["yt:videoId"]),
    })
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11_000) {
      return true
    }

    throw error
  }

  return true
}

const createDeliveries = async ({
  channelId,
  videoIds,
  now,
}: {
  channelId: string
  videoIds: string[]
  now: Date
}) => {
  const cursor = subscriptionCollection.find({ "_id.channelId": channelId })

  const deliveries: DeliverySchema[] = []

  for await (const it of cursor) {
    for (const videoId of videoIds) {
      deliveries.push({
        _id: { chatId: it._id.chatId, videoId },
        createdAt: now,
        nextAttemptAt: now,
        lockedAt: null,
        status: "pending" as const,
        attempts: 0,
      })
    }
  }

  if (deliveries.length === 0) {
    return
  }

  await deliveryCollection.bulkWrite(
    deliveries.map(it => ({
      updateOne: {
        filter: { _id: it._id },
        update: { $setOnInsert: it },
        upsert: true,
      },
    })),
    { ordered: false },
  )
}

export const processChannel = async ({
  channel,
  entries,
  now = new Date(),
  markPolled = true,
}: {
  channel: ChannelSchema
  entries: FeedEntry[]
  now?: Date
  markPolled?: boolean
}) => {
  const videoIds: string[] = []

  for (const it of entries) {
    if (it["yt:videoId"] === channel.lastPolledVideoId) {
      break
    }

    if (await shouldProcessEntry(it)) {
      videoIds.push(it["yt:videoId"])
    }
  }

  if (videoIds.length > 0) {
    await createDeliveries({ channelId: channel._id, videoIds, now })
  }

  if (markPolled) {
    await channelCollection.updateOne(
      { _id: channel._id },
      {
        $set: {
          lastPolledVideoId:
            entries[0]?.["yt:videoId"] ?? channel.lastPolledVideoId,
          lastPolledAt: now,
        },
      },
    )
  }
}

export const pollChannels = async (
  fetchEntries: typeof getEntries = getEntries,
) => {
  const now = new Date()

  const channels = claimLocked({
    collection: channelCollection,
    lockField: "pollLockedAt",
    sort: { lastPolledAt: 1, _id: 1 },
    now,
  })

  for await (const it of channels) {
    try {
      await processChannel({
        channel: it,
        entries: await fetchEntries(it._id),
        now,
      })
    } catch (error) {
      console.error(
        `Failed to poll channel ${it._id}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }
}
