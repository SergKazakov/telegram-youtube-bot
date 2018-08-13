import { redis } from "../redis"
import { handleError } from "../utils/handleError"

export const onSubscribe = handleError(async ({ topic, lease }) => {
  const [, channelId] = topic.split("=")

  await redis.setex(`channel_id:${channelId}`, lease, new Date(lease * 1000))
})
