import { expect, it } from "vitest"

import { deliveryCollection, videoCollection } from "../mongodb.mts"
import {
  client,
  createChannel,
  createChatSubscription,
  expectChannel,
  expectCounts,
} from "../testUtils/index.mts"

const createFeed = ({
  links,
  published = new Date(),
}: { links?: string[]; published?: Date | null } = {}) => /* HTML */ `
  <feed>
    <entry>
      <yt:videoId>videoId</yt:videoId>
      <yt:channelId>channelId</yt:channelId>
      <title>title</title>
      ${links ? links.map(it => `<link href="${it}"/>`).join("") : ""}
      <author>
        <name>name</name>
      </author>
      ${published ? `<published>${published.toISOString()}</published>` : ""}
    </entry>
  </feed>
`

const send = (xml?: string) => client.post("/pubsubhubbub", xml)

it("should skip entries", async () => {
  for (const arg of [undefined, "", createFeed()]) {
    const { status } = await send(arg)

    expect(status).toBe(204)
  }

  await expectCounts(0, 0)
})

it("should create deliveries for subscribed chats", async () => {
  await createChannel()

  await createChatSubscription()

  const { status } = await send(createFeed())

  expect(status).toBe(204)

  await expectChannel({ lastPolledVideoId: null, lastPolledAt: null })

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
})
