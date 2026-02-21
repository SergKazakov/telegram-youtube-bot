import { cleanEnv, port, str, url } from "envalid"

export const env = cleanEnv(process.env, {
  BOT_TOKEN: str({ devDefault: "" }),
  GOOGLE_CLIENT_ID: str({ devDefault: "" }),
  GOOGLE_CLIENT_SECRET: str({ devDefault: "" }),
  MONGODB_URL: url({
    default: "mongodb://localhost:27017/telegram-youtube-bot",
  }),
  PORT: port({ default: 4444 }),
  PUBLIC_URL: url({ default: "http://localhost:4444" }),
  YOUTUBE_API_TOKEN: str({ devDefault: "" }),
})
