import dayjs from "dayjs"
import { expect, it } from "vitest"

import { env } from "../env.mts"
import { deliveryCollection, videoCollection } from "../mongodb.mts"
import { client, createChatSubscription } from "../testUtils/index.mts"
import { youtubeBaseUrl } from "../utils.mts"

type CreateFeedParams = { published?: Date | null; links?: string[] }

const createFeed = ({
  links,
  published = new Date(),
}: CreateFeedParams = {}) => /* HTML */ `
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

const send = (xml: string) => client.post("/pubsubhubbub", xml)

it("should return 400", async () => {
  const { status } = await send("")

  expect(status).toBe(400)
})

it("should skip entries", async () => {
  for (const arg of [
    { published: null },
    {
      published: dayjs()
        .subtract(env.DAYS_TO_IGNORE_VIDEO, "d")
        .subtract(1, "millisecond")
        .toDate(),
    },
    { links: [`${youtubeBaseUrl}/shorts/foo`] },
    { links: [`${youtubeBaseUrl}/watch`, `${youtubeBaseUrl}/shorts/foo`] },
  ] satisfies CreateFeedParams[]) {
    const { status } = await send(createFeed(arg))

    expect(status).toBe(204)
  }

  await expect(videoCollection.findOne()).resolves.toBeNull()

  await expect(deliveryCollection.findOne()).resolves.toBeNull()
})

it("should create deliveries for subscribed chats", async () => {
  await createChatSubscription()

  {
    const { status } = await send(createFeed())

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
    const { status } = await send(createFeed())

    expect(status).toBe(204)

    await expect(videoCollection.countDocuments()).resolves.toBe(1)

    await expect(deliveryCollection.countDocuments()).resolves.toBe(1)
  }
})
