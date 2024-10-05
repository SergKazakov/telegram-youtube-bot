import { type ServerResponse } from "node:http"

import { parseSearchParams } from "../utils.mts"

export const confirmSubscription = async (res: ServerResponse) => {
  const { "hub.challenge": challenge } = await parseSearchParams(
    yup => yup.object({ "hub.challenge": yup.string().trim().required() }),
    res.req,
  )

  res.writeHead(200, { "Content-Type": "text/plain" }).end(challenge)
}
