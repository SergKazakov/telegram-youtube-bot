import { vi } from "vitest"

import type * as Utils from "../utils.mts"

export const {
  buildChannelUrl,
  buildFeedUrlToPoll,
  buildFeedUrlToSubscribe,
  buildVideoUrl,
  parseSearchParams,
  signState,
  verifyState,
  youtubeBaseUrl,
} = await vi.importActual<typeof Utils>("../utils.mts")

export const getOAuth2Client = vi.fn()

export const getYoutubeClient = vi.fn()

export const getSubscriptions = vi.fn()
