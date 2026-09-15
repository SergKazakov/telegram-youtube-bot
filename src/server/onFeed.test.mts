import dayjs from "dayjs"
import { expect, it } from "vitest"

import { env } from "../env.mts"
import {
  channelCollection,
  deliveryCollection,
  videoCollection,
} from "../mongodb.mts"
import {
  client,
  createChannel,
  createChatSubscription,
  expectCounts,
} from "../testUtils/index.mts"
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

const send = (xml?: string) => client.post("/pubsubhubbub", xml)

it("should skip entries", async () => {
  for (const arg of [undefined, ""]) {
    const { status } = await send(arg)

    expect(status).toBe(204)
  }

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

  await expectCounts(0, 0)
})

it("should create deliveries for subscribed chats", async () => {
  await createChannel()

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

    await expect(
      channelCollection.findOne({ _id: "channelId" }),
    ).resolves.toMatchObject({ lastPolledVideoId: "videoId" })
  }

  {
    const { status } = await send(createFeed())

    expect(status).toBe(204)

    await expectCounts(1, 1)
  }
})
