import { subscriptionCollection } from "../mongodb.mts"
import { subscribeToChannel } from "../utils.mts"

export const resubscribeToChannels = async () => {
  for await (const it of subscriptionCollection.aggregate<{ _id: string }>([
    { $group: { _id: "$_id.channelId" } },
  ])) {
    await subscribeToChannel(it._id)
  }
}
