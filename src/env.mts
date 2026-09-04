import { cleanEnv, num, port, str, url } from "envalid"

export const env = cleanEnv(Bun.env, {
  BOT_TOKEN: str({ testDefault: "" }),
  DAYS_TO_IGNORE_VIDEO: num({ default: 1 }),
  DAYS_TO_RESUBSCRIBE: num({ default: 1 }),
  GOOGLE_CLIENT_ID: str({ testDefault: "" }),
  GOOGLE_CLIENT_SECRET: str({ testDefault: "" }),
  HUB_TIMEOUT: num({ default: 30_000 }),
  MAX_ATTEMPTS_TO_DELIVER: num({ default: 5 }),
  MINUTES_TO_CONFIRM_SUBSCRIPTION: num({ default: 30 }),
  MINUTES_TO_RETRY_SUBSCRIPTION: num({ default: 30 }),
  MINUTES_TO_STALE_LOCK: num({ default: 5 }),
  MONGODB_URL: url({
    default: "mongodb://localhost:27017/telegram-youtube-bot",
  }),
  OAUTH_SECRET: str({ testDefault: "foo" }),
  PORT: port({ default: 4444 }),
  PUBLIC_URL: url({ default: "http://localhost:4444" }),
  YOUTUBE_API_TOKEN: str({ testDefault: "" }),
})
