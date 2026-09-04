import dayjs from "dayjs"

import { channelCollection } from "../mongodb.mts"
import { subscribeToChannel } from "../utils.mts"

export const subscribeToChannels = async () => {
  const now = new Date()

  const lockThreshold = dayjs().subtract(5, "m").toDate()

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
          $set: {
            nextAttemptAt: dayjs().add(5, "m").toDate(),
            lastRequestedAt: new Date(),
            lockedAt: null,
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
          $set: {
            nextAttemptAt: dayjs().add(30, "m").toDate(),
            lockedAt: null,
          },
        },
      )
    }
  }
}
