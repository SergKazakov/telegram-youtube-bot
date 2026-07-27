import { parseSearchParams } from "../utils.mts"

import { type RequestHandler } from "./types.mts"

export const confirmSubscription: RequestHandler = async request => {
  const { "hub.challenge": challenge } = await parseSearchParams(
    yup => yup.object({ "hub.challenge": yup.string().trim().required() }),
    request,
  )

  return new Response(challenge, { headers: { "Content-Type": "text/plain" } })
}
