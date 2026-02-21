import { vi } from "vitest"

export const { parseSearchParams } = await vi.importActual("../utils.mts")

export const getOAuth2Client = vi.fn()

export const getYoutubeClient = vi.fn()

export const subscribeToChannel = vi.fn()

export const isShorts = vi.fn().mockResolvedValue(false)
