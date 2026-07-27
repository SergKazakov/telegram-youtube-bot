import pMap from "p-map"

import { env } from "../env.mts"
import { subscriptionCollection } from "../mongodb.mts"
import { subscribeToChannel } from "../utils.mts"

export const resubscribeToChannels = async () => {
  const ids = await subscriptionCollection
    .aggregate<{ _id: string }>([{ $group: { _id: "$_id.channelId" } }])
    .map(it => it._id)
    .toArray()

  await pMap(ids, it => subscribeToChannel(it), {
    concurrency: env.SUBSCRIPTION_CONCURRENCY,
    stopOnError: false,
  })
}
