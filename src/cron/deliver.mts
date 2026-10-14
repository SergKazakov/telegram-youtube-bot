import dayjs from "dayjs"
import { TelegramError } from "telegraf"

import { bot } from "../bot/index.mts"
import { env } from "../env.mts"
import { buildVideoUrl } from "../lib/youtube.mts"
import {
  type DeliverySchema,
  type VideoSchema,
  chatCollection,
  claimLocked,
  deliveryCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"

const updateOne = (
  _id: DeliverySchema["_id"],
  attrs: Partial<Omit<DeliverySchema, "_id">>,
) =>
  deliveryCollection.updateOne({ _id }, { $set: { ...attrs, lockedAt: null } })

export const deliver = async () => {
  const now = new Date()

  const deliveries = claimLocked({
    collection: deliveryCollection,
    lockField: "lockedAt",
    filter: { nextAttemptAt: { $lte: now }, status: "pending" },
    sort: { nextAttemptAt: 1 },
    now,
  })

  const videoMap = new Map<VideoSchema["_id"], VideoSchema | null>()

  const blockedChatIds = new Set<string>()

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
      const text = `<a href="${buildVideoUrl(videoId)}">${video.authorName} – ${video.title}</a>`

      if (video.thumbnail) {
        await bot.telegram.sendPhoto(it._id.chatId, video.thumbnail, {
          caption: text,
          parse_mode: "HTML",
        })
      } else {
        await bot.telegram.sendMessage(it._id.chatId, text, {
          parse_mode: "HTML",
        })
      }

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

      if (error instanceof TelegramError && error.code === 429) {
        await deliveryCollection.updateMany(
          { lockedAt: { $in: [null, now] }, status: "pending" },
          {
            $set: {
              nextAttemptAt: dayjs()
                .add(error.parameters?.retry_after ?? 60, "s")
                .toDate(),
              lockedAt: null,
            },
          },
        )

        break
      }

      const attempts = it.attempts + 1

      await updateOne(it._id, {
        ...(attempts >= env.MAX_ATTEMPTS_TO_DELIVER
          ? { status: "failed" }
          : {
              nextAttemptAt: dayjs()
                .add(60 * 2 ** (attempts - 1), "s")
                .toDate(),
            }),
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
