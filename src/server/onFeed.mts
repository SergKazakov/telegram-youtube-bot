import { type ServerResponse } from "node:http"

import { XMLParser } from "fast-xml-parser"
import * as yup from "yup"

import { bot } from "../bot/index.mjs"
import { subscriptionCollection, videoCollection } from "../mongodb.mjs"

const schema = yup.object({
  feed: yup
    .object({
      entry: yup
        .object({
          "yt:videoId": yup.string().required(),
          "yt:channelId": yup.string().required(),
          title: yup.string().required(),
          author: yup.object({ name: yup.string().required() }).required(),
        })
        .required(),
    })
    .required(),
})

export const onFeed = async (res: ServerResponse) => {
  let rawBody = ""

  for await (const chunk of res.req) rawBody += chunk

  console.log(rawBody)

  const {
    feed: {
      entry: {
        "yt:videoId": videoId,
        "yt:channelId": channelId,
        title,
        author: { name },
      },
    },
  } = await schema.validate(new XMLParser().parse(rawBody))

  res.statusCode = 204

  try {
    await videoCollection.insertOne({ _id: videoId })
  } catch {
    return res.end()
  }

  if (title.includes("#shorts")) {
    return res.end()
  }

  const cursor = subscriptionCollection.find({ "_id.channelId": channelId })

  for await (const x of cursor) {
    await bot.telegram.sendMessage(
      x._id.chatId,
      `<a href="https://www.youtube.com/watch?v=${videoId}">${name} – ${title}</a>`,
      { parse_mode: "HTML" },
    )
  }

  return res.end()
}
