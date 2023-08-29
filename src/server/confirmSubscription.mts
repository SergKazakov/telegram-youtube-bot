import { type ServerResponse } from "node:http"

import * as yup from "yup"

import { agenda } from "../agenda.mjs"
import { parseSearchParams } from "../utils.mjs"

export const confirmSubscription = async (res: ServerResponse) => {
  const {
    "hub.challenge": challenge,
    "hub.lease_seconds": leaseSeconds,
    "hub.topic": topic,
  } = await parseSearchParams(
    yup.object({
      "hub.challenge": yup.string().trim().required(),
      "hub.lease_seconds": yup.number().required(),
      "hub.mode": yup.string().oneOf(["subscribe"]).required(),
      "hub.topic": yup.string().trim().required(),
    }),
    res.req,
  )

  const [, channelId] = topic.split("=")

  await agenda
    .create("prolongSubscription", channelId)
    .unique({ data: channelId, nextRunAt: { $type: "date" } })
    .schedule(new Date(Date.now() + leaseSeconds * 1000))
    .save()

  res.writeHead(200, { "Content-Type": "text/plain" }).end(challenge)
}
