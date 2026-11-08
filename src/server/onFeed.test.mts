import { expect, it } from "vitest"

import { signHub } from "../lib/hub.mts"
import {
  client,
  createChannel,
  createChatSubscription,
  expectCounts,
} from "../testUtils/index.mts"

const createFeed = () => /* HTML */ `
  <feed>
    <entry>
      <yt:videoId>videoId</yt:videoId>
      <yt:channelId>channelId</yt:channelId>
      <title>title</title>
      <author>
        <name>name</name>
      </author>
      <published>${new Date().toISOString()}</published>
    </entry>
  </feed>
`

const send = (xml = "", signature = signHub(xml)) =>
  client.post("/pubsubhubbub", xml, {
    headers: {
      ...(signature && { "X-Hub-Signature": signature }),
      "Content-Type": "application/xml",
    },
  })

it("should return 403 on an invalid signature", async () => {
  for (const signature of ["foo", ""]) {
    const { status } = await send(createFeed(), signature)

    expect(status).toBe(403)
  }
})

it("should skip entries", async () => {
  for (const xml of [undefined, "", createFeed()]) {
    const { status } = await send(xml)

    expect(status).toBe(204)
  }

  await expectCounts(0, 0)
})

it("should handle a valid feed", async () => {
  await createChannel()

  await createChatSubscription()

  const { status } = await send(createFeed())

  expect(status).toBe(204)

  await expectCounts(1, 1)
})
