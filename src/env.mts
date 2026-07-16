import { cleanEnv, num, port, str, url } from "envalid"

export const env = cleanEnv(process.env, {
  BOT_TOKEN: str({ testDefault: "" }),
  GOOGLE_CLIENT_ID: str({ testDefault: "" }),
  GOOGLE_CLIENT_SECRET: str({ testDefault: "" }),
  MONGODB_URL: url({
    default: "mongodb://localhost:27017/telegram-youtube-bot",
  }),
  PORT: port({ default: 4444 }),
  PUBLIC_URL: url({ default: "http://localhost:4444" }),
  YOUTUBE_API_TOKEN: str({ testDefault: "" }),
  MAX_ATTEMPTS_TO_DELIVER: num({ default: 5 }),
})
