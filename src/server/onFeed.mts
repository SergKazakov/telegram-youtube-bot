import { type ServerResponse } from "node:http"
import { text } from "node:stream/consumers"

import dayjs from "dayjs"
import { XMLParser } from "fast-xml-parser"
import * as yup from "yup"

import {
  type DeliverySchema,
  deliveryCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"
import { isShorts } from "../utils.mts"

const schema = yup.object({
  feed: yup
    .object({
      entry: yup
        .object({
          "yt:videoId": yup.string().required(),
          "yt:channelId": yup.string().required(),
          title: yup.string().required(),
          author: yup.object({ name: yup.string().required() }).required(),
          published: yup.date().required(),
        })
        .required(),
    })
    .required(),
})

const xmlParser = new XMLParser()

export const onFeed = async (res: ServerResponse) => {
  const rawBody = await text(res.req)

  console.log(rawBody)

  const {
    feed: { entry },
  } = await schema.validate(xmlParser.parse(rawBody))

  res.statusCode = 204

  if (
    dayjs().diff(entry.published, "d", true) > 1
    || (await isShorts(entry["yt:videoId"]))
  ) {
    return res.end()
  }

  try {
    await videoCollection.insertOne({
      _id: entry["yt:videoId"],
      publishedAt: entry.published,
      authorName: entry.author.name,
      title: entry.title,
    })
  } catch {
    return res.end()
  }

  const cursor = subscriptionCollection.find({
    "_id.channelId": entry["yt:channelId"],
  })

  const rows: DeliverySchema[] = []

  const createdAt = new Date()

  for await (const it of cursor) {
    rows.push({
      _id: { chatId: it._id.chatId, videoId: entry["yt:videoId"] },
      createdAt,
      nextAttemptAt: createdAt,
      status: "pending",
      attempts: 0,
    })
  }

  if (rows.length > 0) {
    await deliveryCollection.insertMany(rows)
  }

  return res.end()
}
