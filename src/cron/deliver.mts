import dayjs from "dayjs"
import { type AnyBulkWriteOperation } from "mongodb"
import { TelegramError } from "telegraf"

import { bot } from "../bot/index.mts"
import { env } from "../env.mts"
import { type DeliverySchema } from "../mongodb.mts"
import {
  chatCollection,
  deliveryCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"
import { buildVideoUrl } from "../utils.mts"

const BATCH_SIZE = 100

async function* getDeliveries() {
  const now = new Date()

  let count = 0

  for (;;) {
    const doc = await deliveryCollection.findOneAndUpdate(
      { nextAttemptAt: { $lte: now }, status: "pending" },
      { $set: { status: "processing" } },
      {
        projection: { attempts: 1 },
        sort: { nextAttemptAt: 1 },
        returnDocument: "after",
      },
    )

    if (!doc || ++count >= BATCH_SIZE) {
      break
    }

    yield doc
  }
}

export const deliver = async () => {
  const deliveries: DeliverySchema[] = []

  const videoIds: DeliverySchema["_id"]["videoId"][] = []

  for await (const it of getDeliveries()) {
    deliveries.push(it)

    videoIds.push(it._id.videoId)
  }

  if (deliveries.length === 0) {
    return
  }

  const videos = await videoCollection
    .find({ _id: { $in: videoIds } })
    .toArray()

  const videoMap = new Map(videos.map(it => [it._id, it]))

  const operations: AnyBulkWriteOperation<DeliverySchema>[] = []

  const blockedChatIds = new Set<string>()

  for (const it of deliveries) {
    const video = videoMap.get(it._id.videoId)

    if (!video) {
      operations.push({
        updateOne: {
          filter: { _id: it._id },
          update: { $set: { status: "failed" } },
        },
      })

      continue
    }

    try {
      await bot.telegram.sendMessage(
        it._id.chatId,
        `<a href="${buildVideoUrl(it._id.videoId)}">${video.authorName} – ${video.title}</a>`,
        { parse_mode: "HTML" },
      )

      operations.push({
        updateOne: {
          filter: { _id: it._id },
          update: { $set: { status: "delivered" } },
        },
      })
    } catch (error) {
      console.error(error)

      if (
        error instanceof TelegramError
        && error.description === "Forbidden: bot was blocked by the user"
      ) {
        operations.push({
          updateOne: {
            filter: { _id: it._id },
            update: { $set: { status: "failed" } },
          },
        })

        blockedChatIds.add(it._id.chatId)

        continue
      }

      const attempts = it.attempts + 1

      operations.push({
        updateOne: {
          filter: { _id: it._id },
          update: {
            $set: {
              ...(attempts < env.MAX_ATTEMPTS_TO_DELIVER && {
                nextAttemptAt: dayjs()
                  .add(2 ** (attempts - 1), "m")
                  .toDate(),
              }),
              status:
                attempts >= env.MAX_ATTEMPTS_TO_DELIVER ? "failed" : "pending",
              attempts,
            },
          },
        },
      })
    }
  }

  if (operations.length > 0) {
    await deliveryCollection.bulkWrite(operations)
  }

  if (blockedChatIds.size > 0) {
    const ids = [...blockedChatIds]

    await Promise.all([
      chatCollection.deleteMany({ _id: { $in: ids } }),
      subscriptionCollection.deleteMany({ "_id.chatId": { $in: ids } }),
    ])
  }
}
