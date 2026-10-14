import dayjs from "dayjs"
import { expect, it, vi } from "vitest"

import { youtubeBaseUrl } from "../lib/__mocks__/youtube.mts"
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

const getEntries = vi.fn().mockResolvedValue(createEntry())

const pollAndExpect = async ({
  channel,
  expectedChannel,
  videos = 0,
  deliveries = 0,
}: {
  channel?: Parameters<typeof createChannel>[0]
  expectedChannel?: Parameters<typeof expectChannel>[0]
  videos?: number
  deliveries?: number
} = {}) => {
  const before = { lastPolledAt: new Date(0), ...channel }

  await createChannel(before)

  const poll = async () => {
    await pollChannels(getEntries)

    await expectChannel(
      {
        lastPolledVideoId: "videoId",
        lastPolledAt: expect.any(Date),
        pollLockedAt: expect.any(Date),
        ...expectedChannel,
      },
      expectedChannel?.lastPolledAt === null
        ? {}
        : { $expr: { $gt: ["$lastPolledAt", before.lastPolledAt] } },
    )

    await expectCounts(videos, deliveries)
  }

  await poll()

  return poll
}

it("should skip videos when the feed is empty", async () => {
  getEntries.mockResolvedValueOnce([])

  await pollAndExpect({ expectedChannel: { lastPolledVideoId: null } })
})

it("should skip videos when the first entry matches lastPolledVideoId", async () => {
  await pollAndExpect({ channel: { lastPolledVideoId: "videoId" } })
})

it("should skip videos without a published field", async () => {
  getEntries.mockResolvedValueOnce(createEntry({ published: null }))

  await pollAndExpect()
})

it("should skip videos older than DAYS_TO_IGNORE_VIDEO", async () => {
  getEntries.mockResolvedValueOnce(
    createEntry({ published: dayjs().subtract(2, "d").toISOString() }),
  )

  await pollAndExpect()
})

it("should skip shorts", async () => {
  getEntries.mockResolvedValueOnce(
    createEntry({ links: [{ "@href": `${youtubeBaseUrl}/shorts/foo` }] }),
  )

  await pollAndExpect()
})

it("should skip duplicate videos", async () => {
  await createVideo()

  await pollAndExpect({ videos: 1, deliveries: 0 })
})

it("should create deliveries if MongoDB failed between the video creation and deliveries", async () => {
  await createVideo()

  await createSubscriptions([{ channelId: "channelId", chatId: "chatId" }])

  await pollAndExpect({ videos: 1, deliveries: 1 })
})

it("should insert a video and create deliveries for the channel", async () => {
  await createSubscriptions([{ channelId: "channelId", chatId: "chatId" }])

  const poll = await pollAndExpect({ videos: 1, deliveries: 1 })

  await poll()
})

it("should keep pollLockedAt on error", async () => {
  getEntries.mockRejectedValueOnce(new Error("foo"))

  await pollAndExpect({
    channel: { lastPolledAt: null },
    expectedChannel: { lastPolledVideoId: null, lastPolledAt: null },
  })
})
