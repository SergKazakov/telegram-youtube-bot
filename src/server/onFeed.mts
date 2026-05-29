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

export const onFeed = async (res: ServerResponse) => {
  const rawBody = await text(res.req)

  console.log(rawBody)

  const {
    feed: {
      entry: {
        "yt:videoId": videoId,
        "yt:channelId": channelId,
        title,
        author: { name },
        published,
      },
    },
  } = await schema.validate(new XMLParser().parse(rawBody))

  res.statusCode = 204

  if (dayjs().diff(published, "d", true) > 1 || (await isShorts(videoId))) {
    return res.end()
  }

  try {
    await videoCollection.insertOne({
      _id: videoId,
      publishedAt: published,
      authorName: name,
      title,
    })
  } catch {
    return res.end()
  }

  const cursor = subscriptionCollection.find({ "_id.channelId": channelId })

  const rows: DeliverySchema[] = []

  const createdAt = new Date()

  for await (const it of cursor) {
    rows.push({
      _id: { chatId: it._id.chatId, videoId },
      createdAt,
      nextAttemptAt: createdAt,
      status: "pending",
      authorName: name,
      title,
      attempts: 0,
    })
  }

  if (rows.length > 0) {
    await deliveryCollection.insertMany(rows)
  }

  return res.end()
}
