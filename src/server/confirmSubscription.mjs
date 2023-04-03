import * as yup from "yup"

import { agenda } from "../agenda.mjs"
import { parseSearchParams } from "../utils.mjs"

const schema = yup.object({
  "hub.challenge": yup.string().trim().required(),
  "hub.lease_seconds": yup.number().required(),
  "hub.mode": yup.mixed().oneOf(["subscribe"]),
  "hub.topic": yup.string().trim().required(),
})

export const confirmSubscription = async (req, res) => {
  const {
    "hub.challenge": challenge,
    "hub.lease_seconds": leaseSeconds,
    "hub.topic": topic,
  } = await schema.validate(parseSearchParams(req))

  const [, channelId] = topic.split("=")

  await agenda
    .create("prolongSubscription", channelId)
    .unique({ data: channelId, nextRunAt: { $type: "date" } })
    .schedule(new Date(Date.now() + leaseSeconds * 1000))
    .save()

  res.writeHead(200, { "Content-Type": "text/plain" }).end(challenge)
}
