import dayjs from "dayjs"

import { env } from "../env.mts"
import { channelCollection } from "../mongodb.mts"
import { subscribeToChannel } from "../utils.mts"

export const subscribeToChannels = async () => {
  const now = new Date()

  const lockThreshold = dayjs()
    .subtract(env.MINUTES_TO_STALE_LOCK, "m")
    .toDate()

  for (;;) {
    const channel = await channelCollection.findOneAndUpdate(
      {
        nextAttemptAt: { $lte: now },
        $or: [{ lockedAt: null }, { lockedAt: { $lte: lockThreshold } }],
      },
      { $set: { lockedAt: now } },
      { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
    )

    if (!channel) {
      break
    }

    const { _id } = channel

    try {
      await subscribeToChannel(_id)

      await channelCollection.updateOne(
        { _id },
        {
          $set: { lastRequestedAt: new Date(), lockedAt: null },
          $max: {
            nextAttemptAt: dayjs()
              .add(env.MINUTES_TO_CONFIRM_SUBSCRIPTION, "m")
              .toDate(),
          },
        },
      )
    } catch (error) {
      console.error(
        `Failed to subscribe to ${_id}:`,
        error instanceof Error ? error.message : error,
      )

      await channelCollection.updateOne(
        { _id },
        {
          $set: { lockedAt: null },
          $max: {
            nextAttemptAt: dayjs()
              .add(env.MINUTES_TO_RETRY_SUBSCRIPTION, "m")
              .toDate(),
          },
        },
      )
    }
  }
}
