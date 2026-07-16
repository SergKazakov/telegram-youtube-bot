import { subscriptionCollection } from "../mongodb.mts"
import { subscribeToChannel } from "../utils.mts"

export const resubscribeToChannels = async () => {
  const cursor = subscriptionCollection.aggregate<{ _id: string }>([
    { $group: { _id: "$_id.channelId" } },
  ])

  for await (const it of cursor) {
    await subscribeToChannel(it._id)
  }
}
