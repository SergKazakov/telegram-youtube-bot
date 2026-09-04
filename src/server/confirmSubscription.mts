import dayjs from "dayjs"
import { ValidationError } from "yup"

import { env } from "../env.mts"
import { channelCollection } from "../mongodb.mts"
import { parseSearchParams } from "../utils.mts"

import { type RequestHandler } from "./types.mts"

export const confirmSubscription: RequestHandler = async request => {
  const {
    "hub.challenge": challenge,
    "hub.topic": topic,
    "hub.mode": mode,
  } = await parseSearchParams(
    yup =>
      yup.object({
        "hub.challenge": yup.string().trim().required(),
        "hub.topic": yup.string().url().required(),
        "hub.mode": yup.string().oneOf(["subscribe", "unsubscribe"]).required(),
      }),
    request,
  )

  const channelId = new URL(topic).searchParams.get("channel_id")

  if (!channelId) {
    throw new ValidationError("Invalid topic")
  }

  if (mode === "subscribe") {
    await channelCollection.updateOne(
      { _id: channelId, lastRequestedAt: { $type: "date" } },
      {
        $set: {
          nextAttemptAt: dayjs().add(env.DAYS_TO_RESUBSCRIBE, "d").toDate(),
          lastConfirmedAt: new Date(),
        },
      },
    )
  } else {
    await channelCollection.deleteOne({ _id: channelId })
  }

  return new Response(challenge, { headers: { "Content-Type": "text/plain" } })
}
