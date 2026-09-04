import {
  channelCollection,
  claimLocked,
  createDeliveries,
} from "../mongodb.mts"
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

  if (videoIds.length > 0) {
    await createDeliveries(channelId, videoIds)
  }

  return { lastPolledVideoId: entries[0]["yt:videoId"] }
}

export const pollChannels = async () => {
  const now = new Date()

  const channels = claimLocked({
    collection: channelCollection,
    lockField: "pollLockedAt",
    sort: { lastPolledAt: 1, _id: 1 },
    now,
  })

  for await (const it of channels) {
    try {
      const { lastPolledVideoId } = await pollChannel(
        it._id,
        it.lastPolledVideoId,
      )

      await channelCollection.updateOne(
        { _id: it._id },
        { $set: { lastPolledVideoId, lastPolledAt: now } },
      )
    } catch (error) {
      console.error(
        `Failed to poll channel ${it._id}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }
}
