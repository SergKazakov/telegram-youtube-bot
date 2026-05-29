import { expect, it } from "vitest"

import { subscribeToChannel } from "../__mocks__/utils.mts"
import { createSubscriptions } from "../testUtils/index.mts"

import { resubscribeToChannels } from "./resubscribeToChannels.mts"

it("should resubscribe to unique channels", async () => {
  await createSubscriptions([
    { channelId: "channelId1", chatId: "chatId1" },
    { channelId: "channelId1", chatId: "chatId2" },
    { channelId: "channelId2", chatId: "chatId1" },
  ])

  await resubscribeToChannels()

  expect(subscribeToChannel).toHaveBeenCalledTimes(2)

  expect(subscribeToChannel).toHaveBeenCalledWith("channelId1")

  expect(subscribeToChannel).toHaveBeenCalledWith("channelId2")
})
