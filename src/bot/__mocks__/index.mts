import { vi } from "vitest"

export const bot = {
  telegram: { sendMessage: vi.fn(), sendPhoto: vi.fn() },
  botInfo: { username: "username" },
}
