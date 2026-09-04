import dayjs from "dayjs"

import { env } from "../env.mts"
import { channelCollection, claimLocked } from "../mongodb.mts"
import { subscribeToChannel } from "../utils.mts"

export const subscribeToChannels = async () => {
  const now = new Date()

  const channels = claimLocked({
    collection: channelCollection,
    lockField: "lockedAt",
    filter: { nextAttemptAt: { $lte: now } },
    sort: { nextAttemptAt: 1 },
    now,
  })

  for await (const { _id } of channels) {
    let lastRequestedAt: Date | undefined

    let minutesToNextAttempt = env.MINUTES_TO_CONFIRM_SUBSCRIPTION

    try {
      await subscribeToChannel(_id)

      lastRequestedAt = new Date()
    } catch (error) {
      console.error(
        `Failed to subscribe to ${_id}:`,
        error instanceof Error ? error.message : error,
      )

      minutesToNextAttempt = env.MINUTES_TO_RETRY_SUBSCRIPTION
    }

    await channelCollection.updateOne(
      { _id },
      {
        $set: { ...(lastRequestedAt && { lastRequestedAt }), lockedAt: null },
        $max: {
          nextAttemptAt: dayjs().add(minutesToNextAttempt, "m").toDate(),
        },
      },
    )
  }
}
