import { timingSafeEqual } from "node:crypto"

import dayjs from "dayjs"
import * as yup from "yup"

import {
  type DeliverySchema,
  deliveryCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"
import { isShorts, signHub } from "../utils.mts"

import { type RequestHandler } from "./types.mts"

const schema = yup.object({
  feed: yup
    .object({
      entry: yup
        .object({
          "yt:videoId": yup.string().required(),
          "yt:channelId": yup.string().required(),
          title: yup.string().required(),
          author: yup.object({ name: yup.string().required() }).required(),
          published: yup.date(),
        })
        .required(),
    })
    .required(),
})

const isSignatureValid = (body: string, signature: string | null) => {
  if (!signature) {
    return false
  }

  const expected = Buffer.from(signHub(body))

  const actual = Buffer.from(signature)

  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

const parseXml = (input: string) => {
  try {
    return Bun.XML.parse(input.trim())
  } catch {
    throw new yup.ValidationError("Invalid XML")
  }
}

export const onFeed: RequestHandler = async request => {
  const rawBody = await request.text()

  if (!isSignatureValid(rawBody, request.headers.get("x-hub-signature"))) {
    return new Response(null, { status: 403 })
  }

  console.log(rawBody)

  const {
    feed: { entry },
  } = await schema.validate(parseXml(rawBody))

  const response = new Response(null, { status: 204 })

  if (
    !entry.published
    || dayjs().diff(entry.published, "d", true) > 1
    || (await isShorts(entry["yt:videoId"]))
  ) {
    return response
  }

  try {
    await videoCollection.insertOne({
      _id: entry["yt:videoId"],
      publishedAt: entry.published,
      authorName: entry.author.name,
      title: entry.title,
    })
  } catch {
    return response
  }

  const createdAt = new Date()

  const rows = await subscriptionCollection
    .find({ "_id.channelId": entry["yt:channelId"] })
    .map<DeliverySchema>(it => ({
      _id: { chatId: it._id.chatId, videoId: entry["yt:videoId"] },
      createdAt,
      nextAttemptAt: createdAt,
      status: "pending" as const,
      attempts: 0,
    }))
    .toArray()

  if (rows.length > 0) {
    await deliveryCollection.insertMany(rows)
  }

  return response
}
