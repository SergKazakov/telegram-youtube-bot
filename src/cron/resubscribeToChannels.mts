import { subscriptionCollection } from "../mongodb.mts"
import { subscribeToChannel } from "../utils.mts"

export const resubscribeToChannels = async () => {
  const ids = await subscriptionCollection
    .aggregate<{ _id: string }>([{ $group: { _id: "$_id.channelId" } }])
    .map(it => it._id)
    .toArray()

  for (const it of ids) {
    try {
      await subscribeToChannel(it)
    } catch (error) {
      console.error(
        `Failed to resubscribe to ${it}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }
}
