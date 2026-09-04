import axios from "axios"
import dayjs from "dayjs"

import { env } from "../env.mts"
import { channelCollection, claimLocked } from "../mongodb.mts"
import { buildFeedUrlToSubscribe } from "../utils.mts"

const subscribeToChannel = (id: string) =>
  axios.post(
    "https://pubsubhubbub.appspot.com",
    new URLSearchParams([
      ["hub.callback", `${env.PUBLIC_URL}/pubsubhubbub`],
      ["hub.mode", "subscribe"],
      ["hub.topic", buildFeedUrlToSubscribe(id)],
      ["hub.verify", "async"],
    ]),
    { timeout: env.HUB_TIMEOUT },
  )

export const subscribeToChannels = async (
  subscribe: typeof subscribeToChannel = subscribeToChannel,
) => {
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
      await subscribe(_id)

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
