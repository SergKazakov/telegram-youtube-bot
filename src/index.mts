import { Cron } from "croner"

import { bot, webhook } from "./bot/index.mts"
import { deliver } from "./cron/deliver.mts"
import { resubscribeToChannels } from "./cron/resubscribeToChannels.mts"
import { env } from "./env.mts"
import { server } from "./server/index.mts"

server.listen(env.PORT, () => console.log(`Listening on ${env.PORT}`))

new Cron(
  "0 0 0 * * *",
  { catch: error => console.error(error) },
  resubscribeToChannels,
)

new Cron(
  "0 * * * * *",
  { catch: error => console.error(error), protect: true },
  deliver,
)

if (!webhook) {
  await bot.launch({ allowedUpdates: [] })
}
