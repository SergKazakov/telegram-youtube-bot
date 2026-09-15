import { channelCollection, createDeliveries } from "../mongodb.mts"
import { schemaToHandleNotification } from "../schemas.mts"
import { shouldProcessEntry } from "../utils.mts"

import { type RequestHandler } from "./types.mts"

const getEntry = async (input: string) => {
  try {
    const parsed = await schemaToHandleNotification.validate(
      Bun.XML.parse(input.trim()),
    )

    return parsed.feed.entry
  } catch {
    return null
  }
}

export const onFeed: RequestHandler = async request => {
  const rawBody = await request.text()

  console.log(rawBody)

  const entry = await getEntry(rawBody)

  const response = new Response(null, { status: 204 })

  if (!entry || !(await shouldProcessEntry(entry))) {
    return response
  }

  await createDeliveries(entry["yt:channelId"], [entry["yt:videoId"]])

  await channelCollection.updateOne(
    { _id: entry["yt:channelId"] },
    { $set: { lastPolledVideoId: entry["yt:videoId"] } },
  )

  return response
}
