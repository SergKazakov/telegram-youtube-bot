import { vi } from "vitest"

import type * as Youtube from "../youtube.mts"

export const {
  buildChannelUrl,
  buildFeedUrlToPoll,
  buildFeedUrlToSubscribe,
  buildVideoUrl,
  deleteSubscription,
  getAllSubscriptions,
  getSubscriptions,
  isRefreshTokenValid,
  youtubeBaseUrl,
} = await vi.importActual<typeof Youtube>("../youtube.mts")

export const getYoutubeClient = vi.fn()
