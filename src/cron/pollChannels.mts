import dayjs from "dayjs"

import { env } from "../env.mts"
import { channelCollection, createDeliveries } from "../mongodb.mts"
import { getEntriesByChannelId, shouldProcessEntry } from "../utils.mts"

const pollChannel = async (
  channelId: string,
  lastPolledVideoId: string | null,
) => {
  const entries = await getEntriesByChannelId(channelId)

  if (entries.length === 0 || entries[0]["yt:videoId"] === lastPolledVideoId) {
    return { lastPolledVideoId }
  }

  const videoIds: string[] = []

  for (const it of entries) {
    if (it["yt:videoId"] === lastPolledVideoId) {
      break
    }

    if (await shouldProcessEntry(it)) {
      videoIds.push(it["yt:videoId"])
    }
  }

  if (videoIds.length === 0) {
    return { lastPolledVideoId: entries[0]["yt:videoId"] }
  }

  await createDeliveries(channelId, videoIds)

  return { lastPolledVideoId: entries[0]["yt:videoId"] }
}

export const pollChannels = async () => {
  const now = new Date()

  const lockThreshold = dayjs()
    .subtract(env.MINUTES_TO_STALE_LOCK, "m")
    .toDate()

  for (;;) {
    const channel = await channelCollection.findOneAndUpdate(
      {
        $or: [
          { pollLockedAt: null },
          { pollLockedAt: { $lte: lockThreshold } },
        ],
      },
      { $set: { pollLockedAt: now } },
      { sort: { lastPolledAt: 1, _id: 1 }, returnDocument: "after" },
    )

    if (!channel) {
      break
    }

    try {
      const { lastPolledVideoId } = await pollChannel(
        channel._id,
        channel.lastPolledVideoId,
      )

      await channelCollection.updateOne(
        { _id: channel._id },
        { $set: { lastPolledVideoId, lastPolledAt: now } },
      )
    } catch (error) {
      console.error(
        `Failed to poll channel ${channel._id}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }
}
