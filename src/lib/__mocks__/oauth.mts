import { vi } from "vitest"

import type * as OAuth from "../oauth.mts"

export const {
  buildAuthUrl,
  exchangeCodeForRefreshToken,
  signState,
  verifyState,
} = await vi.importActual<typeof OAuth>("../oauth.mts")

export const getOAuth2Client = vi.fn()
