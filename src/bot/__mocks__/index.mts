import { vi } from "vitest"

export const bot = {
  telegram: { sendMessage: vi.fn() },
  botInfo: { username: "username" },
}
