import { redis } from "../redis.mjs"
import { handleError } from "../utils/handleError.mjs"

export const onSubscribe = handleError(async ({ topic, lease }) => {
  const [, channelId] = topic.split("=")

  await redis.setex(
    `channel_id:${channelId}`,
    Math.round(lease - Date.now() / 1000),
    new Date(lease * 1000),
  )
})
