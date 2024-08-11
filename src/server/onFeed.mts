import { type ServerResponse } from "node:http"
import { text } from "node:stream/consumers"

import { XMLParser } from "fast-xml-parser"
import { TelegramError } from "telegraf"
import * as yup from "yup"

import { bot } from "../bot/index.mts"
import {
  chatCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"

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

  if (Date.now() - published.getTime() > 24 * 60 * 60 * 1000) {
    return res.end()
  }

  try {
    await videoCollection.insertOne({ _id: videoId })
  } catch {
    return res.end()
  }

  const { status } = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
    method: "HEAD",
    redirect: "manual",
  })

  if (status === 200) {
    return res.end()
  }

  const cursor = subscriptionCollection.find({ "_id.channelId": channelId })

  const shouldDelete: string[] = []

  for await (const x of cursor) {
    try {
      await bot.telegram.sendMessage(
        x._id.chatId,
        `<a href="https://www.youtube.com/watch?v=${videoId}">${name} – ${title}</a>`,
        { parse_mode: "HTML" },
      )
    } catch (error) {
      if (
        error instanceof TelegramError &&
        error.description === "Forbidden: bot was blocked by the user"
      ) {
        shouldDelete.push(x._id.chatId)
      }
    }
  }

  if (shouldDelete.length > 0) {
    await Promise.all([
      chatCollection.deleteMany({ _id: { $in: shouldDelete } }),
      subscriptionCollection.deleteMany({
        "_id.chatId": { $in: shouldDelete },
      }),
    ])
  }

  return res.end()
}
