import * as yup from "yup"

import { channelCollection, createDeliveries } from "../mongodb.mts"
import { schemaToHandleNotification } from "../schemas.mts"
import { shouldProcessEntry } from "../utils.mts"

import { type RequestHandler } from "./types.mts"

const parseXml = (input: string) => {
  try {
    return Bun.XML.parse(input.trim())
  } catch {
    throw new yup.ValidationError("Invalid XML")
  }
}

export const onFeed: RequestHandler = async request => {
  const rawBody = await request.text()

  console.log(rawBody)

  const {
    feed: { entry },
  } = await schemaToHandleNotification.validate(parseXml(rawBody))

  const response = new Response(null, { status: 204 })

  if (!(await shouldProcessEntry(entry))) {
    return response
  }

  await createDeliveries(entry["yt:channelId"], [entry["yt:videoId"]])

  await channelCollection.updateOne(
    { _id: entry["yt:channelId"] },
    { $set: { lastPolledVideoId: entry["yt:videoId"] } },
  )

  return response
}
