import dayjs from "dayjs"
import { TelegramError } from "telegraf"

import { bot } from "../bot/index.mts"
import { env } from "../env.mts"
import {
  type DeliverySchema,
  type VideoSchema,
  chatCollection,
  claimLocked,
  deliveryCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"
import { buildVideoUrl } from "../utils.mts"

const updateOne = (
  _id: DeliverySchema["_id"],
  attrs: Partial<Omit<DeliverySchema, "_id">>,
) =>
  deliveryCollection.updateOne({ _id }, { $set: { ...attrs, lockedAt: null } })

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

  const videoMap = new Map<VideoSchema["_id"], VideoSchema | null>()

  const blockedChatIds = new Set<string>()

  const deliveries = claimLocked({
    collection: deliveryCollection,
    lockField: "lockedAt",
    filter: { nextAttemptAt: { $lte: now }, status: "pending" },
    sort: { nextAttemptAt: 1 },
    now,
  })

  for await (const it of deliveries) {
    const videoId = it._id.videoId

    let video = videoMap.get(videoId)

    if (video === undefined) {
      video = await videoCollection.findOne({ _id: videoId })

      videoMap.set(videoId, video)
    }

    if (!video) {
      await updateOne(it._id, { status: "failed" })

      continue
    }

    try {
      await bot.telegram.sendMessage(
        it._id.chatId,
        `<a href="${buildVideoUrl(videoId)}">${video.authorName} – ${video.title}</a>`,
        { parse_mode: "HTML" },
      )

      await updateOne(it._id, { status: "delivered" })
    } catch (error) {
      console.error(error)

      if (
        error instanceof TelegramError
        && error.description === "Forbidden: bot was blocked by the user"
      ) {
        await updateOne(it._id, { status: "failed" })

        blockedChatIds.add(it._id.chatId)

        continue
      }

      const attempts = it.attempts + 1

      await updateOne(it._id, {
        ...(attempts < env.MAX_ATTEMPTS_TO_DELIVER && {
          nextAttemptAt: getNextAttemptAt(error, attempts),
        }),
        status: attempts >= env.MAX_ATTEMPTS_TO_DELIVER ? "failed" : "pending",
        attempts,
      })
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
