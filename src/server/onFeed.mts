import { processChannel } from "../cron/pollChannels.mts"
import { safeEqual } from "../lib/crypto.mts"
import { signHub } from "../lib/hub.mts"
import { channelCollection } from "../mongodb.mts"
import { schemaToHandleNotification } from "../schemas.mts"

import { type RequestHandler } from "./types.mts"

const getEntry = async (input: string) => {
  try {
    const { feed } = await schemaToHandleNotification.validate(
      Bun.XML.parse(input.trim()),
    )

    return feed.entry
  } catch {
    return null
  }
}

export const onFeed: RequestHandler = async request => {
  const rawBody = await request.text()

  const signature = request.headers.get("x-hub-signature")

  if (!(signature && safeEqual(signHub(rawBody), signature))) {
    return new Response(null, { status: 403 })
  }

  console.log(rawBody)

  const entry = await getEntry(rawBody)

  const channel = entry
    ? await channelCollection.findOne({ _id: entry["yt:channelId"] })
    : null

  if (channel) {
    await processChannel({ channel, entries: [entry!], markPolled: false })
  }

  return new Response(null, { status: 204 })
}
