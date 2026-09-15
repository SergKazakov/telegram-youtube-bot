import dayjs from "dayjs"
import { TelegramError } from "telegraf"

import { bot } from "../bot/index.mts"
import { env } from "../env.mts"
import { type VideoSchema } from "../mongodb.mts"
import {
  chatCollection,
  deliveryCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"
import { buildVideoUrl } from "../utils.mts"

const getNextAttemptAt = (error: unknown, attempts: number) =>
  dayjs()
    .add(
      Math.max(
        60 * 2 ** (attempts - 1),
        error instanceof TelegramError && error.code === 429
          ? (error.parameters?.retry_after ?? 0)
          : 0,
      ),
      "s",
    )
    .toDate()

export const deliver = async () => {
  const now = new Date()

  const lockThreshold = dayjs()
    .subtract(env.MINUTES_TO_STALE_LOCK, "m")
    .toDate()

  const videoMap = new Map<VideoSchema["_id"], VideoSchema | null>()

  const blockedChatIds = new Set<string>()

  for (;;) {
    const delivery = await deliveryCollection.findOneAndUpdate(
      {
        nextAttemptAt: { $lte: now },
        $or: [{ lockedAt: null }, { lockedAt: { $lte: lockThreshold } }],
        status: "pending",
      },
      { $set: { lockedAt: now } },
      {
        projection: { attempts: 1 },
        sort: { nextAttemptAt: 1 },
        returnDocument: "after",
      },
    )

    if (!delivery) {
      break
    }

    const videoId = delivery._id.videoId

    let video = videoMap.get(videoId)

    if (video === undefined) {
      video = await videoCollection.findOne({ _id: videoId })

      videoMap.set(videoId, video)
    }

    if (!video) {
      await deliveryCollection.updateOne(
        { _id: delivery._id },
        { $set: { lockedAt: null, status: "failed" } },
      )

      continue
    }

    try {
      await bot.telegram.sendMessage(
        delivery._id.chatId,
        `<a href="${buildVideoUrl(videoId)}">${video.authorName} – ${video.title}</a>`,
        { parse_mode: "HTML" },
      )

      await deliveryCollection.updateOne(
        { _id: delivery._id },
        { $set: { lockedAt: null, status: "delivered" } },
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof TelegramError
        && error.description === "Forbidden: bot was blocked by the user"
      ) {
        await deliveryCollection.updateOne(
          { _id: delivery._id },
          { $set: { lockedAt: null, status: "failed" } },
        )

        blockedChatIds.add(delivery._id.chatId)

        continue
      }

      const attempts = delivery.attempts + 1

      await deliveryCollection.updateOne(
        { _id: delivery._id },
        {
          $set: {
            ...(attempts < env.MAX_ATTEMPTS_TO_DELIVER && {
              nextAttemptAt: getNextAttemptAt(error, attempts),
            }),
            lockedAt: null,
            status:
              attempts >= env.MAX_ATTEMPTS_TO_DELIVER ? "failed" : "pending",
            attempts,
          },
        },
      )
    }
  }

  if (blockedChatIds.size > 0) {
    const ids = [...blockedChatIds]

    await Promise.all([
      chatCollection.deleteMany({ _id: { $in: ids } }),
      subscriptionCollection.deleteMany({ "_id.chatId": { $in: ids } }),
    ])
  }
}
