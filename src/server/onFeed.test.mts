import { expect, it } from "vitest"

import { isShorts } from "../__mocks__/utils.mts"
import { bot } from "../bot/index.mts"
import {
  chatCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"
import { client } from "../testUtils/index.mts"

import { dayMs } from "./onFeed.mts"

const createSubscriber = async () => {
  await chatCollection.insertOne({ _id: "chatId", refreshToken: "foo" })

  await subscriptionCollection.insertOne({
    _id: { channelId: "channelId", chatId: "chatId" },
  })
}

const createFeed = (published = new Date()) => {
  return /* HTML */ `
    <?xml version='1.0' encoding='UTF-8'?>
    <feed
      xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns="http://www.w3.org/2005/Atom"
    >
      <link rel="hub" href="https://pubsubhubbub.appspot.com" />
      <link
        rel="self"
        href="https://www.youtube.com/xml/feeds/videos.xml?channel_id=channelId"
      />
      <title>YouTube video feed</title>
      <updated>${published.toISOString()}</updated>
      <entry>
        <id>yt:video:videoId</id>
        <yt:videoId>videoId</yt:videoId>
        <yt:channelId>channelId</yt:channelId>
        <title>title</title>
        <link rel="alternate" href="https://www.youtube.com/watch?v=videoId" />
        <author>
          <name>name</name>
          <uri>https://www.youtube.com/channel/channelId</uri>
        </author>
        <published>${published.toISOString()}</published>
        <updated>${published.toISOString()}</updated>
      </entry>
    </feed>
  `
}

const postPubSubHubBub = (xml: string) =>
  client.post("/pubsubhubbub", xml, {
    headers: { "Content-Type": "application/xml" },
  })

it("should return 400", async () => {
  const { status } = await postPubSubHubBub("")

  expect(status).toBe(400)
})

it("should not process videos older than 24 hours", async () => {
  const { status } = await postPubSubHubBub(
    createFeed(new Date(Date.now() - dayMs - 1)),
  )

  expect(status).toBe(204)

  expect(bot.telegram.sendMessage).not.toHaveBeenCalled()
})

it("should filter Shorts", async () => {
  isShorts.mockResolvedValueOnce(true)

  const { status } = await postPubSubHubBub(createFeed())

  expect(status).toBe(204)

  expect(bot.telegram.sendMessage).not.toHaveBeenCalled()
})

it("should send a message to subscribed chats", async () => {
  await createSubscriber()

  {
    const { status } = await postPubSubHubBub(createFeed())

    expect(status).toBe(204)

    expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
      "chatId",
      `<a href="https://www.youtube.com/watch?v=videoId">name – title</a>`,
      { parse_mode: "HTML" },
    )

    await expect(
      videoCollection.findOne({ _id: "videoId" }),
    ).resolves.toMatchObject({ publishedAt: expect.any(Date) })
  }

  {
    const { status } = await postPubSubHubBub(createFeed())

    expect(status).toBe(204)

    expect(bot.telegram.sendMessage).toBeCalledTimes(1)
  }
})
