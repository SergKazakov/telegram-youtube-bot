import { redis } from "../redis"
import { handleError } from "../utils/handleError"

export const onSubscribe = handleError(
  async ({ topic, lease }: { topic: string; lease: number }) => {
    const [, channelId] = topic.split("=")

    await redis.setex(
      `channel_id:${channelId}`,
      Math.round(lease - Date.now() / 1000),
      new Date(lease * 1000).getTime(),
    )
  },
)
