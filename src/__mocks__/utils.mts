import { vi } from "vitest"

import type * as Utils from "../utils.mts"

export const {
  buildChannelUrl,
  buildFeedUrlToSubscribe,
  buildVideoUrl,
  isShorts,
  linkSchema,
  parseSearchParams,
  signState,
  verifyState,
  youtubeBaseUrl,
} = await vi.importActual<typeof Utils>("../utils.mts")

export const getOAuth2Client = vi.fn()

export const getYoutubeClient = vi.fn()

export const getSubscriptions = vi.fn()

export const subscribeToChannel = vi.fn()
