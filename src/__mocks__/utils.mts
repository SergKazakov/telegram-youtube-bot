import { vi } from "vitest"

import type * as Utils from "../utils.mts"

export const {
  buildChannelUrl,
  buildFeedUrl,
  buildVideoUrl,
  parseSearchParams,
} = await vi.importActual<typeof Utils>("../utils.mts")

export const getOAuth2Client = vi.fn()

export const getYoutubeClient = vi.fn()

export const getSubscriptions = vi.fn()

export const subscribeToChannel = vi.fn()

export const isShorts = vi.fn().mockResolvedValue(false)
