import dayjs from "dayjs"
import { expect, it } from "vitest"

import {
  buildChannelUrl,
  buildFeedUrl,
  buildVideoUrl,
  isShorts,
} from "../__mocks__/utils.mts"
import { deliveryCollection, videoCollection } from "../mongodb.mts"
import { client, createChatSubscription } from "../testUtils/index.mts"

const createFeed = (published = new Date()) =>
  /* HTML */
  `
    <?xml version='1.0' encoding='UTF-8'?>
    <feed
      xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns="http://www.w3.org/2005/Atom"
    >
      <link rel="hub" href="https://pubsubhubbub.appspot.com" />
      <link rel="self" href="${buildFeedUrl("channelId")}" />
      <title>YouTube video feed</title>
      <updated>${published.toISOString()}</updated>
      <entry>
        <id>yt:video:videoId</id>
        <yt:videoId>videoId</yt:videoId>
        <yt:channelId>channelId</yt:channelId>
        <title>title</title>
        <link rel="alternate" href="${buildVideoUrl("videoId")}" />
        <author>
          <name>name</name>
          <uri>${buildChannelUrl("channelId")}</uri>
        </author>
        <published>${published.toISOString()}</published>
        <updated>${published.toISOString()}</updated>
      </entry>
    </feed>
  `

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
    createFeed(dayjs().subtract(1, "d").subtract(1, "millisecond").toDate()),
  )

  expect(status).toBe(204)

  await expect(videoCollection.findOne()).resolves.toBeNull()

  await expect(deliveryCollection.findOne()).resolves.toBeNull()
})

it("should filter Shorts", async () => {
  isShorts.mockResolvedValueOnce(true)

  const { status } = await postPubSubHubBub(createFeed())

  expect(status).toBe(204)

  await expect(videoCollection.findOne()).resolves.toBeNull()

  await expect(deliveryCollection.findOne()).resolves.toBeNull()
})

it("should create deliveries for subscribed chats", async () => {
  await createChatSubscription()

  {
    const { status } = await postPubSubHubBub(createFeed())

    expect(status).toBe(204)

    await expect(
      videoCollection.findOne({ _id: "videoId" }),
    ).resolves.toMatchObject({
      publishedAt: expect.any(Date),
      authorName: "name",
      title: "title",
    })

    await expect(
      deliveryCollection.findOne({
        _id: { chatId: "chatId", videoId: "videoId" },
      }),
    ).resolves.toMatchObject({
      createdAt: expect.any(Date),
      nextAttemptAt: expect.any(Date),
      status: "pending",
      attempts: 0,
    })
  }

  {
    const { status } = await postPubSubHubBub(createFeed())

    expect(status).toBe(204)

    await expect(videoCollection.countDocuments()).resolves.toBe(1)

    await expect(deliveryCollection.countDocuments()).resolves.toBe(1)
  }
})
