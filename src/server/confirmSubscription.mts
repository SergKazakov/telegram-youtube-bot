import dayjs from "dayjs"

import { channelCollection } from "../mongodb.mts"
import { parseSearchParams } from "../utils.mts"

import { type RequestHandler } from "./types.mts"

export const confirmSubscription: RequestHandler = async request => {
  const { "hub.challenge": challenge, "hub.topic": topic } =
    await parseSearchParams(
      yup =>
        yup.object({
          "hub.challenge": yup.string().trim().required(),
          "hub.topic": yup.string().url().required(),
          "hub.mode": yup.string().oneOf(["subscribe"]).required(),
        }),
      request,
    )

  const channelId = new URL(topic).searchParams.get("channel_id")

  if (channelId) {
    await channelCollection.updateOne(
      { _id: channelId },
      {
        $set: {
          nextAttemptAt: dayjs().add(1, "d").toDate(),
          lastConfirmedAt: new Date(),
        },
      },
    )
  }

  return new Response(challenge, { headers: { "Content-Type": "text/plain" } })
}
