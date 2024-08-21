import { type ServerResponse } from "node:http"

import * as yup from "yup"

import { parseSearchParams } from "../utils.ts"

export const confirmSubscription = async (res: ServerResponse) => {
  const { "hub.challenge": challenge } = await parseSearchParams(
    yup.object({ "hub.challenge": yup.string().trim().required() }),
    res.req,
  )

  res.writeHead(200, { "Content-Type": "text/plain" }).end(challenge)
}
