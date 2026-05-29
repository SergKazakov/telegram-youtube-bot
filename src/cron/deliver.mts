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
} from "../mongodb.mts"

export const deliver = async () => {
  const cursor = deliveryCollection
    .find({ nextAttemptAt: { $lte: new Date() }, status: "pending" })
    .sort({ nextAttemptAt: 1 })

  const operations: AnyBulkWriteOperation<DeliverySchema>[] = []

  const blockedChatIds = new Set<string>()

  for await (const it of cursor) {
    try {
      await bot.telegram.sendMessage(
        it._id.chatId,
        `<a href="https://www.youtube.com/watch?v=${it._id.videoId}">${it.authorName} – ${it.title}</a>`,
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
                  .add(2 ** (attempts - 1), "minute")
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
