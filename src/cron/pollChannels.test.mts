import dayjs from "dayjs"
import { expect, it } from "vitest"

import { getEntriesByChannelId, youtubeBaseUrl } from "../__mocks__/utils.mts"
import {
  createChannel,
  createSubscriptions,
  createVideo,
  expectChannel,
  expectCounts,
} from "../testUtils/index.mts"

import { pollChannels } from "./pollChannels.mts"

const createEntry = ({
  channelId = "channelId",
  videoId = "videoId",
  links,
  published = new Date().toISOString(),
}: Partial<{
  channelId: string
  videoId: string
  links: { "@href": string }[]
  published: string | null
}> = {}) => [
  {
    ...(links && { link: links }),
    ...(published && { published }),
    "yt:videoId": videoId,
    "yt:channelId": channelId,
    title: "title",
    author: { name: "name" },
  },
]

getEntriesByChannelId.mockResolvedValue(createEntry())

it("should skip videos when the feed is empty", async () => {
  await createChannel()

  getEntriesByChannelId.mockResolvedValueOnce([])

  await pollChannels()

  await expectCounts(0, 0)
})

it("should skip videos when the first entry matches lastPolledVideoId", async () => {
  await createChannel({ lastPolledVideoId: "videoId" })

  await pollChannels()

  await expectCounts(0, 0)
})

it("should skip videos without a published field", async () => {
  await createChannel()

  getEntriesByChannelId.mockResolvedValueOnce(createEntry({ published: null }))

  await pollChannels()

  await expectCounts(0, 0)
})

it("should skip videos older than DAYS_TO_IGNORE_VIDEO", async () => {
  await createChannel()

  getEntriesByChannelId.mockResolvedValueOnce(
    createEntry({ published: dayjs().subtract(2, "d").toISOString() }),
  )

  await pollChannels()

  await expectCounts(0, 0)
})

it("should skip shorts", async () => {
  await createChannel()

  getEntriesByChannelId.mockResolvedValueOnce(
    createEntry({ links: [{ "@href": `${youtubeBaseUrl}/shorts/foo` }] }),
  )

  await pollChannels()

  await expectCounts(0, 0)
})

it("should skip duplicate videos", async () => {
  await createChannel()

  await createVideo()

  await pollChannels()

  await expectCounts(1, 0)
})

it("should insert a video and create deliveries for the channel", async () => {
  await createChannel()

  await createSubscriptions([{ channelId: "channelId", chatId: "chatId" }])

  await pollChannels()

  await expectChannel({
    lastPolledVideoId: "videoId",
    lastPolledAt: expect.any(Date),
    pollLockedAt: expect.any(Date),
  })

  await expectCounts(1, 1)

  await pollChannels()

  await expectCounts(1, 1)
})

it("should keep pollLockedAt on error", async () => {
  await createChannel()

  getEntriesByChannelId.mockRejectedValueOnce(new Error("foo"))

  await pollChannels()

  await expectChannel({
    lastPolledVideoId: null,
    lastPolledAt: null,
    pollLockedAt: expect.any(Date),
  })
})
